# How We Built SEO for a React Blog Using Vite, Cloudflare Workers, and Vercel

> **Suggested summary:** A practical explanation of how Inkwell makes React articles understandable to Google and social platforms using canonical URLs, server-rendered metadata, structured data, sitemaps, RSS, and edge rendering.
>
> **Suggested topics:** SEO, React, Cloudflare Workers, Vercel, Web Development
>
> **Suggested cover-image alt text:** An illustration showing a React website connected to Google, Cloudflare Workers, and social media platforms.

React applications provide fast and interactive experiences, but they can create challenges for search engines.

In this article, I will explain how we implemented SEO for **Inkwell**, our blogging and learning platform.

Our application uses:

- React and Vite for the frontend
- Hono and Cloudflare Workers for the backend
- PostgreSQL and Prisma for storing articles
- Vercel for hosting the frontend

We will explore canonical URLs, metadata, Open Graph tags, structured data, sitemaps, RSS feeds, and server-rendered article pages.

---

## What does SEO mean?

SEO stands for **Search Engine Optimization**.

It is the process of helping search engines such as Google understand:

- What a page is about
- Who wrote the content
- When it was published
- Which URL represents the original article
- Whether the page should appear in search results
- How the result should look when displayed

SEO is not a switch that guarantees a high Google ranking. It makes a website technically understandable and eligible for indexing.

Search engines still decide whether and where a page appears based on its quality, relevance, authority, and other signals.

---

## The problem with client-rendered React applications

A traditional server-rendered website sends the complete article inside its first HTML response.

A basic React application often sends something closer to this:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

The browser downloads JavaScript, runs React, requests the article from the API, and finally displays it.

This works well for human visitors, but some crawlers and social-media preview systems do not execute all that JavaScript. They may only see an empty root element.

That creates several problems:

- The article text may not be immediately visible to crawlers
- Every page may appear to have the same title
- Social-media previews may be missing
- Search engines may have difficulty identifying the canonical URL
- Structured information about the article may be unavailable

We solved this by combining React with an edge-rendered HTML response.

---

## Our SEO architecture

The public URL for an article looks like this:

```text
https://our-domain.com/story/how-we-built-seo
```

When someone opens an article from inside the React application, React displays the interactive reader.

When a direct request is made to that URL, Vercel forwards it to our Cloudflare Worker. The Worker retrieves the published article and generates complete HTML containing the article and its SEO metadata.

The request flow looks like this:

```text
Reader or crawler
        |
        v
/story/article-slug
        |
        v
Vercel rewrite
        |
        v
Cloudflare Worker
        |
        v
PostgreSQL article
        |
        v
Complete HTML response
```

This approach gives us both:

- A responsive React experience for readers
- Complete HTML for search engines and social crawlers

---

## Human-readable article slugs

Originally, an article could be identified using a database ID:

```text
/blog/7fd93e4a-cc1b-4e12
```

Database IDs are useful internally, but they do not explain what the page contains.

We introduced readable slugs:

```text
/story/how-we-built-seo
```

A simplified slug generator looks like this:

```ts
export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
```

For production, we also add a unique value when necessary so that two stories with the same title never receive the same URL.

Readable URLs help both people and search engines understand the subject of a page.

---

## Dynamic page titles and descriptions

Every article should have a title and description that accurately represent its content.

The generated HTML contains metadata similar to this:

```html
<title>How We Built SEO for a React Blog | Inkwell</title>

<meta
  name="description"
  content="Learn how Inkwell uses React, Cloudflare Workers, and Vercel to generate search-friendly article pages."
/>
```

The `<title>` normally appears in the browser tab, as the main heading of a search result, and in bookmarks or browser history.

The description can be used as the explanatory text underneath a search result. Search engines may rewrite either value, but supplying accurate metadata gives them a strong starting point.

---

## Canonical URLs

A page can sometimes be available through multiple URLs:

```text
/blog/123
/story/how-we-built-seo
/share/how-we-built-seo
```

If all three URLs display the same article, a search engine may not know which one is the primary version.

A canonical tag solves this problem:

```html
<link
  rel="canonical"
  href="https://our-domain.com/story/how-we-built-seo"
/>
```

The canonical tag tells crawlers that this is the preferred public URL for the article.

In Inkwell, the slug-based `/story/:slug` URL is the canonical version. Legacy URLs can continue working without competing with the preferred article URL.

---

## Open Graph metadata

Search-engine metadata and social-media metadata are related, but they are not identical.

Platforms such as LinkedIn, Facebook, Discord, and other applications commonly use the Open Graph protocol to create link previews.

Our article HTML includes tags such as:

```html
<meta property="og:type" content="article" />
<meta property="og:title" content="How We Built SEO for a React Blog" />
<meta
  property="og:description"
  content="A practical guide to SEO with React, Cloudflare Workers, and Vercel."
/>
<meta
  property="og:url"
  content="https://our-domain.com/story/how-we-built-seo"
/>
<meta
  property="og:image"
  content="https://our-domain.com/media/article-cover-image"
/>
```

These values control the title, summary, URL, and image shown when someone shares an article.

If an author uploads a cover image, we use it as the social-preview image. Otherwise, Inkwell uses a default branded image.

---

## Twitter card metadata

X, formerly called Twitter, supports its own preview metadata.

We generate tags such as:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="How We Built SEO for a React Blog" />
<meta
  name="twitter:description"
  content="A practical guide to SEO with React and edge rendering."
/>
<meta
  name="twitter:image"
  content="https://our-domain.com/media/article-cover-image"
/>
```

The `summary_large_image` card tells the platform to create a preview that emphasizes the article cover image.

---

## Structured article data

HTML metadata describes the page, but structured data gives search engines a machine-readable description of the article.

We use JSON-LD, which stands for **JavaScript Object Notation for Linked Data**.

Here is a simplified example:

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How We Built SEO for a React Blog",
    "description": "A practical guide to SEO with React and edge rendering.",
    "author": {
      "@type": "Person",
      "name": "Monish Mukhari"
    },
    "datePublished": "2026-10-11T10:00:00.000Z",
    "dateModified": "2026-10-11T12:30:00.000Z",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://our-domain.com/story/how-we-built-seo"
    }
  }
</script>
```

Important fields include:

- `@type`: identifies the content as an article
- `headline`: the article title
- `description`: a short summary
- `author`: the person who wrote it
- `datePublished`: when it was first published
- `dateModified`: when it was last updated
- `mainEntityOfPage`: the canonical article URL

Structured data does not guarantee a special search result, but it gives search engines clearer information about the page.

---

## Edge-rendering the article

Our Cloudflare Worker retrieves the published story from PostgreSQL and produces a complete HTML document.

A simplified version looks like this:

```ts
app.get("/render/:slug", async (context) => {
  const slug = context.req.param("slug");

  const story = await prisma.post.findFirst({
    where: {
      slug,
      published: true,
    },
    include: {
      author: true,
    },
  });

  if (!story) {
    return context.html("<h1>Story not found</h1>", 404);
  }

  const canonicalUrl = `${frontendUrl}/story/${story.slug}`;

  return context.html(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>${escapeHtml(story.title)} | Inkwell</title>
        <meta
          name="description"
          content="${escapeHtml(story.summary)}"
        />
        <link rel="canonical" href="${canonicalUrl}" />
      </head>
      <body>
        <article>
          <h1>${escapeHtml(story.title)}</h1>
          ${renderMarkdown(story.content)}
        </article>
      </body>
    </html>
  `);
});
```

The real implementation also generates Open Graph tags, Twitter metadata, dates, cover images, author information, and JSON-LD.

Notice that dynamic values are escaped before being added to HTML. This is essential for preventing user-provided content from becoming executable HTML or JavaScript.

---

## Connecting Vercel to the Worker

The frontend is deployed on Vercel, while article HTML is generated by Cloudflare Workers.

We connect them using a Vercel rewrite:

```json
{
  "rewrites": [
    {
      "source": "/story/:slug",
      "destination": "https://api.example.com/render/:slug"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

The order matters. The specific story rule must come before the general React fallback. Otherwise, Vercel would send every article request to the empty React shell.

The public URL remains clean because visitors do not need to know that Cloudflare generated the HTML behind the scenes.

---

## Creating a dynamic sitemap

A sitemap is an XML document containing the public URLs that we want search engines to discover.

Our Worker generates `/sitemap.xml` from published database records:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://our-domain.com/</loc>
  </url>
  <url>
    <loc>https://our-domain.com/story/how-we-built-seo</loc>
    <lastmod>2026-10-11T12:30:00.000Z</lastmod>
  </url>
</urlset>
```

Only published stories are included. Drafts, scheduled articles that are not yet published, and private authoring pages must never appear in the sitemap.

The `lastmod` value tells crawlers when the article was most recently updated.

---

## Controlling crawlers with robots.txt

The `robots.txt` file communicates which areas crawlers are allowed to visit.

Our configuration follows this general structure:

```text
User-agent: *
Allow: /

Disallow: /publish
Disallow: /write/
Disallow: /stories/mine

Sitemap: https://our-domain.com/sitemap.xml
```

This allows public content to be crawled while discouraging crawlers from entering private authoring routes.

It is important to understand that `robots.txt` is not an authentication system. Private information must still be protected by backend authorization. A crawler rule only provides crawling instructions.

---

## Providing an RSS feed

RSS allows readers and feed applications to subscribe to newly published articles.

Our Worker generates `/rss.xml` using the latest published stories:

```xml
<item>
  <title>How We Built SEO for a React Blog</title>
  <link>https://our-domain.com/story/how-we-built-seo</link>
  <description>
    A practical guide to SEO with React and edge rendering.
  </description>
  <pubDate>Sun, 11 Oct 2026 10:00:00 GMT</pubDate>
</item>
```

RSS is not only an SEO feature. It also provides an open, platform-independent way for readers to follow publications.

---

## Keeping drafts out of search results

An important SEO requirement is ensuring that private or unfinished content does not become public accidentally.

Our public article queries require:

```ts
where: {
  published: true,
}
```

Drafts are only available through authenticated author routes.

Scheduled stories remain private until their scheduled publication time. A Cloudflare cron job regularly checks for stories that are ready to publish.

This creates a clear boundary:

```text
Draft or scheduled story
        |
        | Not publicly discoverable
        v
Publication time reached
        |
        v
Published story
        |
        +--> Public API
        +--> Canonical HTML
        +--> Sitemap
        +--> RSS
```

---

## Metadata inside the React application

The edge-rendered page handles direct requests and crawlers, but readers also navigate between stories without reloading the React application.

For those navigations, we update the browser metadata when the story changes:

```ts
document.title = `${story.title} | Inkwell`;

setMetaTag("name", "description", story.summary);
setMetaTag("property", "og:title", story.title);
setMetaTag("property", "og:description", story.summary);
setMetaTag("property", "og:url", canonicalUrl);
```

We also update the canonical link:

```ts
function setCanonicalUrl(url: string) {
  let canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }

  canonical.href = url;
}
```

When the reader leaves the story, we restore the default site metadata. This prevents one article's title and description from leaking into another page.

---

## SEO also depends on content quality

Technical SEO makes an article accessible to search engines, but good code cannot replace useful writing.

A strong educational article should include:

- A clear and specific title
- A concise summary
- One main heading
- Descriptive subheadings
- Original explanations
- Useful examples
- Accessible image descriptions
- Links with meaningful text
- Accurate publication and update dates

For example, this link is unclear:

```markdown
[Click here](https://example.com)
```

This version provides context:

```markdown
[Read the Cloudflare Workers deployment guide](https://example.com)
```

Headings should follow a logical hierarchy:

```markdown
# Main article title

## Major section

### Detail inside that section
```

A logical structure helps readers scan the article and helps software understand how its sections relate to one another.

---

## What happens after deployment?

Implementing SEO does not mean an article immediately appears in Google.

After deployment, we still need to:

1. Verify that production article pages return complete HTML.
2. Confirm that canonical URLs use the production domain.
3. Test Open Graph and Twitter previews.
4. Validate structured data.
5. Submit the sitemap through Google Search Console.
6. Monitor indexing and crawl errors.
7. Continue publishing original, useful content.

Indexing may take time, and search engines ultimately decide which pages appear in their results.

---

## Final architecture

Our final SEO flow looks like this:

```text
Author publishes a story
          |
          v
Story stored in PostgreSQL
          |
          +-------------------+
          |                   |
          v                   v
Public React API       Cloudflare HTML renderer
          |                   |
          v                   v
Interactive reader     Search-engine-ready HTML
                              |
                +-------------+-------------+
                |             |             |
                v             v             v
             Google      Social cards    Link previews
```

This architecture lets us keep the fast and interactive React experience while providing complete, meaningful HTML to systems that need it.

---

## Conclusion

The most important lesson is that SEO is not just a collection of meta tags.

A complete implementation requires several systems to work together:

- Stable and readable URLs
- Canonical links
- Accurate titles and descriptions
- Social-preview metadata
- Structured article data
- Server-rendered public content
- A dynamic sitemap
- Crawl instructions
- An RSS feed
- Strict separation between public stories and private drafts

By combining React, Vercel, Cloudflare Workers, Prisma, and PostgreSQL, Inkwell now provides an interactive reading experience without hiding its articles from search engines.

The next step is to deploy the system, submit the sitemap, monitor indexing, and continue creating content that is genuinely worth discovering.
