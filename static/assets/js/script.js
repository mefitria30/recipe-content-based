/*
function cariResep ()
{
    const nama = document.getElementById( "namaResep" ).value;
    fetch( `https://recipe-content-based.onrender.com/recommend?nama_resep=${ encodeURIComponent( nama ) }&top_n=12` )
        .then( res => res.json() )
        .then( data =>
        {
            const hasilDiv = document.getElementById( "hasil" );
            hasilDiv.innerHTML = "";

            if ( !Array.isArray( data ) || data.length === 0 )
            {
                // render card fallback
                hasilDiv.innerHTML = `
          <div class="menu-category">
            <h3>Resep tidak ditemukan</h3>
            <div class="menu-row"><span class="dish-name">Info</span><span class="dish-price">Resep "${ nama }" tidak ada di database</span></div>
          </div>
        `;
                // redirect ke halaman depan setelah 2 detik
                setTimeout( () =>
                {
                    window.location.href = "/";
                }, 10000 );
                return;
            }

            // render hasil normal
            data.forEach( item =>
            {
                const kategori = Array.isArray( item.kategori ) ? item.kategori.join( ", " ) : item.kategori;
                hasilDiv.innerHTML += `
          <div class="menu-category">
            <h3>${ item.judul }</h3>
            <div class="menu-row"><span class="dish-name">Kategori</span><span class="dish-price">${ kategori }</span></div>
            <div class="menu-row"><span class="dish-name">Waktu</span><span class="dish-price">${ item.waktu ? item.waktu + " menit" : "-" }</span></div>
            <div class="menu-row"><span class="dish-name">Similarity</span><span class="dish-price">${ item.skor }</span></div>
          </div>
        `;
            } );
        } )
        .catch( err =>
        {
            console.error( "Fetch error:", err );
            hasilDiv.innerHTML = `
        <div class="menu-category">
          <h3>Error</h3>
          <div class="menu-row"><span class="dish-name">Info</span><span class="dish-price">Terjadi error saat ambil data</span></div>
        </div>
      `;
            setTimeout( () =>
            {
                window.location.href = "/";
            }, 10000 );
        } );
}
*/

async function cariResep ()
{
    const nama = document.getElementById( "namaResep" ).value;
    const hasilDiv = document.getElementById( "hasil" );
    hasilDiv.innerHTML = "";

    if ( navigator.onLine )
    {
        // ONLINE → pakai API Flask
        fetch( `/recommend?nama_resep=${ encodeURIComponent( nama ) }&top_n=12` )
            .then( res => res.json() )
            .then( data =>
            {
                if ( !Array.isArray( data ) || data.length === 0 )
                {
                    hasilDiv.innerHTML = `
            <div class="menu-category">
              <h3>Resep tidak ditemukan</h3>
              <div class="menu-row"><span class="dish-name">Info</span>
              <span class="dish-price">Resep "${ nama }" tidak ada di database</span></div>
            </div>`;
                    return;
                }

                data.forEach( item =>
                {
                    const kategori = Array.isArray( item.kategori ) ? item.kategori.join( ", " ) : item.kategori;
                    const queryTag = item.is_query ? " [QUERY]" : "";  // tandai resep yang dicari
                    hasilDiv.innerHTML += `
                        <div class="menu-category">
                        <h3>${ item.judul }</h3>
                        <div class="menu-row"><span class="dish-name">Kategori</span><span class="dish-price">${ kategori }</span></div>
                        <div class="menu-row"><span class="dish-name">Waktu</span><span class="dish-price">${ item.waktu ? item.waktu + " menit" : "-" }</span></div>
                        <div class="menu-row"><span class="dish-name">Similarity</span><span class="dish-price">${ item.skor }</span></div>
                        </div>`;
                } );
            } )
            .catch( err =>
            {
                console.error( "Fetch error:", err );
                hasilDiv.innerHTML = `
          <div class="menu-category">
            <h3>Error</h3>
            <div class="menu-row"><span class="dish-name">Info</span>
            <span class="dish-price">Terjadi error saat ambil data</span></div>
          </div>`;
            } );
    } else
    {
        // OFFLINE → pakai JSON lokal + embeddings
        try
        {
            const [ resData, resEmb ] = await Promise.all( [
                fetch( "/static/resep_dataset_clean.json" ),
                fetch( "/static/resep_embeddings.json" )
            ] );
            const data = await resData.json();
            const embeddings = await resEmb.json();

            const idx = data.findIndex( r => r.nama_resep.toLowerCase() === nama.toLowerCase() );
            if ( idx === -1 )
            {
                hasilDiv.innerHTML = `
        <div class="menu-category">
          <h3>Resep tidak ditemukan</h3>
          <div class="menu-row"><span class="dish-name">Info</span>
          <span class="dish-price">Resep "${ nama }" tidak ada di database offline</span></div>
        </div>`;
                return;
            }

            const query = data[ idx ];
            const queryVec = embeddings[ idx ];
            const queryCat = query.kategori_norm ? eval( query.kategori_norm ) : [];
            const queryBahan = query.list_bahan_norm ? eval( query.list_bahan_norm ) : [];

            function cosineSimilarity ( vecA, vecB )
            {
                let dot = 0, normA = 0, normB = 0;
                for ( let i = 0; i < vecA.length; i++ )
                {
                    dot += vecA[ i ] * vecB[ i ];
                    normA += vecA[ i ] * vecA[ i ];
                    normB += vecB[ i ] * vecB[ i ];
                }
                return dot / ( Math.sqrt( normA ) * Math.sqrt( normB ) );
            }

            function jaccard ( list1, list2 )
            {
                const s1 = new Set( list1 ), s2 = new Set( list2 );
                return s1.size && s2.size ? [ ...s1 ].filter( x => s2.has( x ) ).length / new Set( [ ...s1, ...s2 ] ).size : 0;
            }

            const hasil = data.map( ( r, i ) =>
            {
                if ( i === idx ) return null;
                const cat = r.kategori_norm ? eval( r.kategori_norm ) : [];
                const bahan = r.list_bahan_norm ? eval( r.list_bahan_norm ) : [];
                let skor = cosineSimilarity( queryVec, embeddings[ i ] );
                if ( queryCat.some( c => cat.includes( c ) ) ) skor += 0.1;
                skor += 0.2 * jaccard( queryBahan, bahan );
                return {
                    judul: r.nama_resep,
                    kategori: cat,
                    waktu: r.waktu_norm,
                    skor: skor
                };
            } )
                .filter( Boolean )
                .sort( ( a, b ) => b.skor - a.skor )
                .slice( 0, 12 );

            hasil.forEach( item =>
            {
                const kategori = Array.isArray( item.kategori ) ? item.kategori.join( ", " ) : item.kategori;
                hasilDiv.innerHTML += `
        <div class="menu-category">
          <h3>${ item.judul }</h3>
          <div class="menu-row"><span class="dish-name">Kategori</span><span class="dish-price">${ kategori }</span></div>
          <div class="menu-row"><span class="dish-name">Waktu</span><span class="dish-price">${ item.waktu ? item.waktu + " menit" : "-" }</span></div>
          <div class="menu-row"><span class="dish-name">Similarity</span><span class="dish-price">${ item.skor.toFixed( 3 ) }</span></div>
        </div>`;
            } );
        } catch ( err )
        {
            console.error( "Offline JSON error:", err );
        }
    }
}

function goBack ()
{
    document.getElementById( "hasil" ).innerHTML = "";
    document.getElementById( "namaResep" ).value = "";
}

function updateDataset ()
{
    fetch( "https://recipe-content-based.onrender.com/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { csv_path: "resep_dataset_clean.csv" } )
    } )
        .then( res => res.json() )
        .then( data =>
        {
            alert( data.status );
        } );
}
