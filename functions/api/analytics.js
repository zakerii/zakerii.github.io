// functions/api/analytics.js
export async function onRequestGet(context) {
  try {
    const token = context.env.CF_API_TOKEN;
    const zoneId = context.env.CF_ZONE_ID || 'f12a7b01cd63e23b45b9b6dfc5c94c40';

    if (!token) {
      return new Response(JSON.stringify({ error: 'CF_API_TOKEN not set' }), { status: 500 });
    }

    const query = `
    query {
      viewer {
        zones(filter: {zoneTag: "${zoneId}"}) {
          httpRequests1dGroups(limit: 7, filter: {date_geq: "2026-11-08"}) {
            dimensions {
              date
            }
            sum {
              requests
              pageViews
              bytes
              threats
              countryMap {
                clientCountryName
                requests
              }
            }
            uniq {
              uniques
            }
          }
        }
      }
    }
    `;

    const cfResp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const cfData = await cfResp.json();
    const zoneGroups = cfData?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    // Aggregate totals
    let totalRequests = 0;
    let totalPageViews = 0;
    let totalBytes = 0;
    let totalThreats = 0;
    let totalUniques = 0;
    const countryMap = {};

    zoneGroups.forEach(g => {
      totalRequests += g.sum?.requests || 0;
      totalPageViews += g.sum?.pageViews || 0;
      totalBytes += g.sum?.bytes || 0;
      totalThreats += g.sum?.threats || 0;
      totalUniques += g.uniq?.uniques || 0;

      if (Array.isArray(g.sum?.countryMap)) {
        g.sum.countryMap.forEach(c => {
          const code = c.clientCountryName || 'Other';
          countryMap[code] = (countryMap[code] || 0) + (c.requests || 0);
        });
      }
    });

    const topCountries = Object.entries(countryMap)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        totalRequests,
        totalPageViews,
        totalBytesMb: (totalBytes / (1024 * 1024)).toFixed(1),
        totalThreats,
        totalUniques,
        history: zoneGroups.map(g => ({
          date: g.dimensions?.date,
          requests: g.sum?.requests,
          uniques: g.uniq?.uniques
        })),
        topCountries
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
