// Validate Mapbox token
if (!mapToken || mapToken === '' || mapToken === 'undefined') {
    console.error('ERROR: Invalid or missing Mapbox token');
    document.getElementById('map').innerHTML = '<div class="alert alert-danger">Map is not available. Please contact admin.</div>';
} else {
    mapboxgl.accessToken = mapToken;
    try {
        const map = new mapboxgl.Map({
            container: 'map', // container ID
            center: listing.geometry.coordinates, // starting position [lng, lat]
            zoom: 9 // starting zoom
        });

        const marker = new mapboxgl.Marker({color:"red"})
            .setLngLat(listing.geometry.coordinates) //listing/geo-coordinate
            .setPopup(new mapboxgl.Popup({offset: 25})
            .setHTML(`<h4>${listing.title}</h4><p>Exact Location will be provided after Booking</p>`))
                .addTo(map);
    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('map').innerHTML = '<div class="alert alert-danger">Map initialization failed. Please try again later.</div>';
    }
}
