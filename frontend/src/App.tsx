import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Blog } from './pages/Blog';
import { Blogs } from './pages/Blogs';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { MyStories } from './pages/MyStories';
import { Publish } from './pages/Publish';
import { Signin } from './pages/Signin';
import { Signup } from './pages/Signup';
import { Profile } from './pages/Profile';
import { ProfileSettings } from './pages/ProfileSettings';
import { Notifications } from './pages/Notifications';
import { ContinueReading } from './pages/ContinueReading';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/blog/:id" element={<Blog />} />
        <Route path="/story/:id" element={<Blog />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/author/:identifier" element={<Profile />} />
        <Route
          path="/publish"
          element={
            <ProtectedRoute>
              <Publish />
            </ProtectedRoute>
          }
        />
        <Route
          path="/write/:id"
          element={
            <ProtectedRoute>
              <Publish />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stories/mine"
          element={
            <ProtectedRoute>
              <MyStories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning/continue"
          element={
            <ProtectedRoute>
              <ContinueReading />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
