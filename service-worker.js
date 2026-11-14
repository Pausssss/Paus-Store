const CACHE_NAME='paus-studio-v9-blue-20261020';
const CORE=['/','/index.html','/offline.html','/assets/css/styles.css','/assets/css/studio.css','/assets/images/product-fallback.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('paus-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/admin')||url.pathname.startsWith('/assets/js/admin/')||url.pathname==='/assets/css/admin.css'||url.pathname.includes('supabase-config'))return;
  const network=async cache=>{
    const response=await fetch(event.request);
    if(response.ok)event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));
    return response;
  };
  if(url.pathname.startsWith('/assets/')){
    // Build-versioned JS/CSS and product images are reusable within this release.
    event.respondWith(caches.open(CACHE_NAME).then(async cache=>await cache.match(event.request)||network(cache)));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(cache=>network(cache).catch(async()=>await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match('/offline.html'):Response.error()))));
});
