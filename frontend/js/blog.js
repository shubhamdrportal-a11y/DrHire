// ── Blog listing page ───────────────────────────────────────────
(function () {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const featuredWrap = document.getElementById('blogFeatured');
  const filterRow = document.getElementById('blogFilterRow');
  const posts = DC_BLOG_POSTS;
  const featured = posts[0];
  const rest = posts.slice(1);

  featuredWrap.innerHTML = `
    <div class="blog-featured-img"><i class="fa-solid ${featured.icon}"></i></div>
    <div class="blog-featured-body">
      <span class="blog-category">${featured.category}</span>
      <h2>${featured.title}</h2>
      <p style="color:var(--muted);line-height:1.8">${featured.excerpt}</p>
      <div class="blog-meta-row" style="border-top:none;padding-top:0">
        <span><i class="fa-regular fa-calendar"></i> ${featured.date} • ${featured.author}</span>
        <a class="blog-read-more" href="blog-details.html?post=${featured.slug}">Read Article →</a>
      </div>
    </div>`;

  const categories = ['All', ...new Set(posts.map(p => p.category))];
  filterRow.innerHTML = categories.map((c, i) => `<button class="blog-filter-pill ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');

  function card(post) {
    return `<div class="blog-card">
      <div class="blog-card-img"><i class="fa-solid ${post.icon}"></i></div>
      <div class="blog-card-body">
        <span class="blog-category">${post.category}</span>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <div class="blog-meta-row">
          <span>${post.date}</span>
          <a class="blog-read-more" href="blog-details.html?post=${post.slug}">Read More →</a>
        </div>
      </div>
    </div>`;
  }

  function render(cat) {
    const list = cat === 'All' ? rest : rest.filter(p => p.category === cat);
    grid.innerHTML = list.length ? list.map(card).join('') :
      `<div class="state-box" style="grid-column:1/-1"><i class="fa-solid fa-newspaper"></i><h3>No articles in this category yet</h3></div>`;
  }

  filterRow.addEventListener('click', e => {
    const btn = e.target.closest('.blog-filter-pill');
    if (!btn) return;
    filterRow.querySelectorAll('.blog-filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.cat);
  });

  render('All');
})();
