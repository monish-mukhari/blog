import axios from 'axios';
import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../config';
import { linesToList } from '../lib/learning';
import { LearningDraft, QuizDraft } from '../lib/learning-draft';

interface SeriesItem {
  id: string;
  title: string;
  _count: { posts: number };
}

export const LearningEditor = ({
  value,
  onChange
}: {
  value: LearningDraft;
  onChange: (value: LearningDraft) => void;
}) => {
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [newSeries, setNewSeries] = useState('');
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/learning/series/mine`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      })
      .then((response) => setSeries(response.data.series || []))
      .catch(() => setSeries([]));
  }, []);
  const set = <K extends keyof LearningDraft>(field: K, fieldValue: LearningDraft[K]) =>
    onChange({ ...value, [field]: fieldValue });
  const createSeries = async () => {
    if (newSeries.trim().length < 3) return;
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/learning/series`,
      { title: newSeries },
      { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }
    );
    const created = { ...response.data.series, _count: { posts: 0 } };
    setSeries((current) => [created, ...current]);
    set('seriesId', created.id);
    setNewSeries('');
  };
  const addQuiz = () =>
    set('quizQuestions', [
      ...value.quizQuestions,
      { question: '', options: ['', ''], correctIndex: 0, explanation: '' }
    ]);
  const updateQuiz = (index: number, quiz: QuizDraft) =>
    set(
      'quizQuestions',
      value.quizQuestions.map((item, itemIndex) => (itemIndex === index ? quiz : item))
    );
  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-4">
      <h3 className="text-sm font-semibold">Learning structure</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
        Help readers understand the level, goals, preparation, and next steps.
      </p>
      <label className="mt-4 block text-xs font-semibold">
        Difficulty
        <select
          value={value.difficulty}
          onChange={(event) => set('difficulty', event.target.value as LearningDraft['difficulty'])}
          className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        >
          <option value="">Not specified</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      <ListField
        label="Learning outcomes"
        value={value.learningOutcomes}
        placeholder="One outcome per line"
        onChange={(items) => set('learningOutcomes', items)}
      />
      <ListField
        label="Prerequisites"
        value={value.prerequisites}
        placeholder="One prerequisite per line"
        onChange={(items) => set('prerequisites', items)}
      />
      <ListField
        label="References"
        value={value.references}
        placeholder="One complete URL per line"
        onChange={(items) => set('references', items)}
      />
      <label className="mt-4 block text-xs font-semibold">
        Last reviewed
        <input
          type="date"
          value={value.lastReviewedAt ? value.lastReviewedAt.slice(0, 10) : ''}
          onChange={(event) =>
            set(
              'lastReviewedAt',
              event.target.value ? new Date(`${event.target.value}T00:00:00Z`).toISOString() : ''
            )
          }
          className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
        />
      </label>
      <label className="mt-4 block text-xs font-semibold">
        Series
        <select
          value={value.seriesId}
          onChange={(event) => set('seriesId', event.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        >
          <option value="">No series</option>
          {series.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {value.seriesId && (
        <label className="mt-3 block text-xs font-semibold">
          Order in series
          <input
            type="number"
            min={1}
            max={1000}
            value={value.seriesOrder || ''}
            onChange={(event) =>
              set('seriesOrder', event.target.value ? Number(event.target.value) : undefined)
            }
            className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
        </label>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={newSeries}
          onChange={(event) => setNewSeries(event.target.value)}
          placeholder="New series title"
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={() => void createSeries()}
          className="rounded-lg border border-[#2563eb] px-3 text-xs font-semibold text-[#2563eb]"
        >
          Create
        </button>
      </div>
      <div className="mt-6 border-t border-[var(--line)] pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Knowledge-check questions</h4>
          <button type="button" onClick={addQuiz} className="text-xs font-semibold text-[#2563eb]">
            Add question
          </button>
        </div>
        <div className="mt-3 space-y-4">
          {value.quizQuestions.map((quiz, index) => (
            <QuizEditor
              key={index}
              index={index}
              quiz={quiz}
              onChange={(next) => updateQuiz(index, next)}
              onRemove={() =>
                set(
                  'quizQuestions',
                  value.quizQuestions.filter((_, itemIndex) => itemIndex !== index)
                )
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const ListField = ({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string[];
  placeholder: string;
  onChange: (value: string[]) => void;
}) => (
  <label className="mt-4 block text-xs font-semibold">
    {label}
    <textarea
      defaultValue={value.join('\n')}
      onBlur={(event) => onChange(linesToList(event.target.value))}
      placeholder={placeholder}
      className="mt-2 min-h-20 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-normal"
    />
  </label>
);

const QuizEditor = ({
  index,
  quiz,
  onChange,
  onRemove
}: {
  index: number;
  quiz: QuizDraft;
  onChange: (quiz: QuizDraft) => void;
  onRemove: () => void;
}) => (
  <div className="rounded-lg bg-[var(--surface)] p-3">
    <div className="flex justify-between text-xs font-semibold">
      <span>Question {index + 1}</span>
      <button type="button" onClick={onRemove} className="text-[var(--muted)]">
        Remove
      </button>
    </div>
    <input
      value={quiz.question}
      onChange={(event) => onChange({ ...quiz, question: event.target.value })}
      placeholder="What should the reader understand?"
      className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
    />
    {quiz.options.map((option, optionIndex) => (
      <div key={optionIndex} className="mt-2 flex items-center gap-2">
        <input
          type="radio"
          checked={quiz.correctIndex === optionIndex}
          onChange={() => onChange({ ...quiz, correctIndex: optionIndex })}
          aria-label={`Mark option ${optionIndex + 1} correct`}
        />
        <input
          value={option}
          onChange={(event) =>
            onChange({
              ...quiz,
              options: quiz.options.map((item, itemIndex) =>
                itemIndex === optionIndex ? event.target.value : item
              )
            })
          }
          placeholder={`Option ${optionIndex + 1}`}
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
        />
      </div>
    ))}
    <button
      type="button"
      onClick={() => onChange({ ...quiz, options: [...quiz.options, ''] })}
      disabled={quiz.options.length >= 6}
      className="mt-2 text-xs font-semibold text-[#2563eb] disabled:opacity-40"
    >
      Add option
    </button>
    <textarea
      value={quiz.explanation || ''}
      onChange={(event) => onChange({ ...quiz, explanation: event.target.value })}
      placeholder="Explain the answer (optional)"
      className="mt-2 min-h-16 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
    />
  </div>
);
