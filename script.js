const clientId = CONFIG.CLIENT_ID;
const clientSecret = CONFIG.CLIENT_SECRET;
const redirectUri = CONFIG.REDIRECT_URI;
const scopes = 'user-read-currently-playing user-read-playback-state';

// Function to get the authorization URL
function getAuthorizationUrl() {
    return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
}

// Function to extract the authorization code from the URL
function getAuthorizationCode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Function to get Spotify Access Token
async function getAccessToken(authorizationCode) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret) // Base64 encoded client_id:client_secret
        },
        body: new URLSearchParams({
            'grant_type': 'authorization_code',
            'code': authorizationCode,
            'redirect_uri': redirectUri
        })
    });
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token;
}

// Function to refresh Spotify Access Token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret) // Base64 encoded client_id:client_secret
        },
        body: new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': refreshToken
        })
    });
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return data.access_token;
}

// Function to fetch currently playing song data
async function fetchCurrentlyPlaying() {
    let accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        const authorizationCode = getAuthorizationCode();
        if (authorizationCode) {
            accessToken = await getAccessToken(authorizationCode);
            history.pushState({}, null, '/'); // Remove authorization code from URL
        } else {
            window.location.href = getAuthorizationUrl();
            return;
        }
    }

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (response.status === 401) { // Access token expired
        accessToken = await refreshAccessToken();
        return fetchCurrentlyPlaying();
    }

    const data = await response.json();
    return data;
}

// Function to update the cards with song data
async function updateSpotifyCards() {
    const songData = await fetchCurrentlyPlaying();
    if (songData && songData.is_playing) {
        // Update Vertical Card
        document.getElementById('album-cover-vertical').src = songData.item.album.images[0].url;
        document.getElementById('song-name-vertical').innerText = songData.item.name;
        document.getElementById('artist-name-vertical').innerText = songData.item.artists.map(artist => artist.name).join(', ');
        // Update Horizontal Card
        document.getElementById('album-cover-horizontal').src = songData.item.album.images[0].url;
        document.getElementById('song-name-horizontal').innerText = songData.item.name;
        document.getElementById('artist-name-horizontal').innerText = songData.item.artists.map(artist => artist.name).join(', ');

        // Generate profile code
        const profileCode = `[![spotify-github-profile](https://spotify-github-profile.kittinanx.com/api/view?uid=YOUR_SPOTIFY_USER_ID&cover_image=true&theme=default&show_offline=false&background_color=121212&interchange=false)](https://github.com/kittinan/spotify-github-profile)`;
        document.getElementById('profile-code').value = profileCode.replace("YOUR_SPOTIFY_USER_ID", songData.item.album.id);
    }
}

// Initial call to update the cards
updateSpotifyCards();
// Set an interval to update the cards periodically (e.g., every 3 seconds)
setInterval(updateSpotifyCards, 3000);
