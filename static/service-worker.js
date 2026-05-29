const CACHE_NAME = "resep-cache-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/about.html",
    "/offline.html",
    "/static/resep_dataset_clean.json",
    "/static/manifest.json",
    "/static/icons/icon-192.png",
    "/static/icons/icon-512.png",
    "/static/assets/css/style.css",
    "/static/assets/images/hero.webp",
    "/static/assets/js/booktable.js",
    "/static/assets/js/main.js",
    "/static/assets/js/script.js"
];

// Install: cache semua file
self.addEventListener( "install", event =>
{
    event.waitUntil(
        caches.open( CACHE_NAME ).then( cache =>
        {
            return Promise.all(
                urlsToCache.map( url =>
                    cache.add( url ).catch( err => console.error( "❌ Gagal cache:", url, err ) )
                )
            );
        } )
    );
} );

// Fetch: serve dari cache, fallback ke offline.html
self.addEventListener( "fetch", event =>
{
    event.respondWith(
        caches.match( event.request ).then( response =>
        {
            return response || fetch( event.request ).catch( () =>
            {
                if ( event.request.mode === "navigate" )
                {
                    return caches.match( "/offline.html" );
                }
            } );
        } )
    );
} );

