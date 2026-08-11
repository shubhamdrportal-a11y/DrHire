// ── Blog details page ───────────────────────────────────────────
(function () {
  const articleEl = document.getElementById('articleBody');
  if (!articleEl) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('post');
  const post = DC_BLOG_POSTS.find(p => p.slug === slug) || DC_BLOG_POSTS[0];

  document.title = `${post.title} – Doctors Coat Blog`;

  document.getElementById('articleHeader').innerHTML = `
    <span class="section-tag">${post.category}</span>
    <h1>${post.title}</h1>
  `;

  document.getElementById('articleMetaBar').innerHTML = `
    <div class="article-author">${post.author.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
    <div>
      <strong style="display:block;font-size:.92rem">${post.author}</strong>
      <span style="color:var(--muted);font-size:.8rem">${post.date} • ${post.category}</span>
    </div>
  `;

  articleEl.innerHTML = post.content.map(p => `<p>${p}</p>`).join('');

  const related = DC_BLOG_POSTS.filter(p => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const fallback = related.length ? related : DC_BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 3);

  document.getElementById('relatedPostsGrid').innerHTML = fallback.map(p => `
    <div class="blog-card">
      <div class="blog-card-img"><i class="fa-solid ${p.icon}"></i></div>
      <div class="blog-card-body">
        <span class="blog-category">${p.category}</span>
        <h3>${p.title}</h3>
        <div class="blog-meta-row">
          <span>${p.date}</span>
          <a class="blog-read-more" href="blog-details.html?post=${p.slug}">Read More →</a>
        </div>
      </div>
    </div>
  `).join('');
})();
