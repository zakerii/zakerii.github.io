// functions/api/trends.js — Free live trend radar (HackerNews + Reddit) with zero AI quota cost

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const q = (url.searchParams.get('q') || 'gaming').toLowerCase();

    const topics = [];

    // 1. Fetch HackerNews top/relevant stories (fast, free JSON API)
    try {
      const hnRes = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=6`);
      if (hnRes.ok) {
        const hnData = await hnRes.json();
        for (const hit of (hnData.hits || [])) {
          if (hit.title) {
            topics.push({
              title: hit.title,
              summary: `Trending on HackerNews (${hit.points || 0} pts, ${hit.num_comments || 0} comments). Source: ${hit.url || 'news.ycombinator.com'}`,
              source: 'HackerNews'
            });
          }
        }
      }
    } catch (e) {}

    // 2. Fetch Reddit hot/search JSON (gaming / tech)
    try {
      const redditRes = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=hot&t=week&limit=6`, {
        headers: { 'User-Agent': 'ZakeriiStudio/1.0' }
      });
      if (redditRes.ok) {
        const rData = await redditRes.json();
        for (const child of (rData?.data?.children || [])) {
          const p = child.data;
          if (p && p.title) {
            topics.push({
              title: p.title,
              summary: `r/${p.subreddit} • ${p.ups || 0} upvotes, ${p.num_comments || 0} comments.`,
              source: `r/${p.subreddit}`
            });
          }
        }
      }
    } catch (e) {}

    return new Response(JSON.stringify({ success: true, topics: topics.slice(0, 8) }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
