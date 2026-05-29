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
