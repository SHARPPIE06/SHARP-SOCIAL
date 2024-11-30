import { createClient } from 'https://esm.sh/@supabase/supabase-js'

class VisitorTracker {
    constructor() {
        // Initialize Supabase with environment variables
        this.supabase = createClient(
            'https://miygojwoyvvwdjkjugif.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peWdvandveXZ2d2Rqa2p1Z2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NDEzMDQsImV4cCI6MjA0ODUxNzMwNH0.bjyOiSDwvTRFaBrWTGGEl4u_G2DetVnV1vE6DDmPK4E'
        );
        this.map = null;
        console.log('VisitorTracker initialized'); // Debug log
        this.trackVisitor();
    }

    async trackVisitor() {
        const statusElement = document.getElementById('tracking-status');
        
        try {
            statusElement.innerHTML = '<span style="color: #ff0000;">INITIALIZING TRACKING...</span>';
            
            // Get IP-based location info
            this.ipInfo = await this.getVisitorInfo();
            statusElement.innerHTML = '<span style="color: #ff0000;">USING IP LOCATION</span>';
            
            if (!this.ipInfo.latitude || !this.ipInfo.longitude) {
                statusElement.innerHTML = '<span style="color: #ff0000;">LOCATION DATA UNAVAILABLE</span>';
                return;
            }

            // Get device info
            const deviceInfo = {
                os: navigator.platform,
                browser: navigator.userAgent,
                deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                screen: `${window.screen.width}x${window.screen.height}`
            };
            
            this.addMarker(this.ipInfo.latitude, this.ipInfo.longitude);
            
            await this.saveVisitorData({
                latitude: parseFloat(this.ipInfo.latitude).toFixed(6),
                longitude: parseFloat(this.ipInfo.longitude).toFixed(6),
                ip_address: this.ipInfo.ip,
                os: deviceInfo.os,
                browser: deviceInfo.browser,
                device_type: deviceInfo.deviceType,
                screen_resolution: deviceInfo.screen,
                country: this.ipInfo.country_name || 'Unknown',
                isp: this.ipInfo.org || 'Unknown',
                visit_time: new Date().toISOString()
            });
            
            statusElement.innerHTML = '<span style="color: #ff0000;">LOCATION TRACKED [IP]</span>';
        } catch (error) {
            console.error('Error tracking visitor:', error);
            statusElement.innerHTML = '<span style="color: #ff0000;">TRACKING FAILED</span>';
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            // Check if we're in a secure context
            if (!window.isSecureContext) {
                console.error('Geolocation requires a secure context (HTTPS)');
                reject(new Error('Geolocation requires HTTPS'));
                return;
            }

            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }

    async getVisitorInfo() {
        try {
            // First try with ipify
            try {
                console.log('Fetching IP address from ipify...');
                const response = await fetch('https://api.ipify.org?format=json', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                
                if (!response.ok) throw new Error('ipify fetch failed');
                const ipData = await response.json();
                console.log('IP data received:', ipData);
                
                // Get location data using ipwho.is
                console.log('Fetching geolocation data...');
                const geoResponse = await fetch(`https://ipwho.is/${ipData.ip}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                
                if (!geoResponse.ok) throw new Error('Geo fetch failed');
                const data = await geoResponse.json();
                console.log('Geolocation data received:', data);
                
                if (!data.success) throw new Error('Geo data invalid');
                
                return {
                    ip: data.ip,
                    country_name: data.country || 'Unknown',
                    org: data.connection?.isp || 'Unknown',
                    latitude: data.latitude,
                    longitude: data.longitude
                };
            } catch (error) {
                // If first attempt fails, try alternative API
                console.log('First attempt failed, trying alternative API...');
                const response = await fetch('https://api64.ipify.org?format=json', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                
                if (!response.ok) throw new Error('Alternative API fetch failed');
                const ipData = await response.json();
                console.log('IP data received:', ipData);
                
                // Get location data using ipwho.is
                console.log('Fetching geolocation data...');
                const geoResponse = await fetch(`https://ipwho.is/${ipData.ip}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                
                if (!geoResponse.ok) throw new Error('Geo fetch failed');
                const data = await geoResponse.json();
                console.log('Geolocation data received:', data);
                
                if (!data.success) throw new Error('Geo data invalid');
                
                return {
                    ip: data.ip,
                    country_name: data.country || 'Unknown',
                    org: data.connection?.isp || 'Unknown',
                    latitude: data.latitude,
                    longitude: data.longitude
                };
            }
        } catch (error) {
            console.error('Error getting IP info:', error);
            return {
                ip: 'unknown',
                country_name: 'Unknown',
                org: 'Unknown',
                latitude: null,
                longitude: null
            };
        }
    }

    addMarker(lat, lng) {
        try {
            const customIcon = L.divIcon({
                html: `
                    <div class="marker-container">
                        <div class="marker-dot">☠️</div>
                        <div class="marker-ripple ripple-1"></div>
                        <div class="marker-ripple ripple-2"></div>
                        <div class="marker-ripple ripple-3"></div>
                    </div>
                    <style>
                        .marker-container {
                            position: relative;
                            width: 12px;
                            height: 12px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        }
                        .marker-dot {
                            position: absolute;
                            font-size: 12px;
                            z-index: 1000;
                        }
                        .marker-ripple {
                            position: absolute;
                            border: 1px solid #ff0000;
                            width: 12px;
                            height: 12px;
                            border-radius: 50%;
                            opacity: 0;
                            box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                        }
                        .ripple-1 {
                            animation: ripple 2s infinite ease-out;
                        }
                        .ripple-2 {
                            animation: ripple 2s infinite ease-out 0.5s;
                        }
                        .ripple-3 {
                            animation: ripple 2s infinite ease-out 1s;
                        }
                        @keyframes ripple {
                            0% {
                                transform: scale(1);
                                opacity: 0.8;
                            }
                            100% {
                                transform: scale(2.5);
                                opacity: 0;
                            }
                        }
                    </style>`,
                className: 'custom-marker',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            L.marker([lat, lng], { icon: customIcon }).addTo(this.map)
                .bindPopup(`
                    <div style="
                        color: #ff0000;
                        background: #000;
                        padding: 15px;
                        border: 1px solid #ff0000;
                        box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                        font-family: 'Courier New', monospace;
                        min-width: 200px;
                    ">
                        <div style="
                            border-bottom: 1px solid #ff0000;
                            margin-bottom: 10px;
                            padding-bottom: 5px;
                            font-size: 14px;
                            text-shadow: 0 0 5px #ff0000;
                            text-align: center;
                        ">
                            YOUR IP IS UNDER MY CONTROL☠️
                        </div>
                        <div style="
                            font-size: 12px;
                            margin-bottom: 8px;
                            text-shadow: 0 0 3px #ff0000;
                        ">
                            <strong>LAT:</strong> ${lat}<br>
                            <strong>LNG:</strong> ${lng}
                        </div>
                        <div style="
                            font-size: 12px;
                            margin-bottom: 12px;
                            padding: 5px;
                            background: rgba(255, 0, 0, 0.1);
                            border-left: 2px solid #ff0000;
                        ">
                            <strong>PUBLIC IPv4:</strong><br>
                            <span style="
                                color: #ff0000;
                                text-shadow: 0 0 5px #ff0000;
                            ">${this.ipInfo?.ip || 'Unknown'}</span>
                        </div>
                        <div style="
                            font-size: 11px;
                            text-align: center;
                            margin-top: 15px;
                            padding: 8px;
                            border: 1px dashed #ff0000;
                            background: rgba(255, 0, 0, 0.05);
                            animation: glitch 2s infinite;
                        ">
                            I DIDN'T GET YOUR ACTUAL LOCATION<br>
                            BUT I CAN MANIPULATE YOUR<br>
                            <span style="
                                font-weight: bold;
                                font-size: 13px;
                                text-shadow: 0 0 8px #ff0000;
                            ">PUBLIC IPv4 ☠️</span>
                        </div>
                        <style>
                            @keyframes glitch {
                                0% { opacity: 1; transform: translate(0); }
                                20% { opacity: 0.8; transform: translate(-2px, 2px); }
                                40% { opacity: 1; transform: translate(2px, -2px); }
                                60% { opacity: 0.8; transform: translate(-2px); }
                                80% { opacity: 1; transform: translate(2px); }
                                100% { opacity: 1; transform: translate(0); }
                            }
                        </style>
                    </div>
                `);
        } catch (error) {
            console.error('Error adding marker:', error);
        }
    }

    async saveVisitorData(visitorData) {
        try {
            console.log('Attempting to save visitor data:', visitorData);
            
            const dataToInsert = {
                latitude: parseFloat(visitorData.latitude).toFixed(6),
                longitude: parseFloat(visitorData.longitude).toFixed(6),
                ip_address: visitorData.ip_address || 'unknown',
                os: (visitorData.os || 'Unknown').substring(0, 255),
                browser: (visitorData.browser || 'Unknown').substring(0, 255),
                device_type: (visitorData.device_type || 'Unknown').substring(0, 50),
                screen_resolution: (visitorData.screen_resolution || 'Unknown').substring(0, 50),
                country: (visitorData.country || 'Unknown').substring(0, 100),
                isp: (visitorData.isp || 'Unknown').substring(0, 255),
                visit_time: new Date().toISOString()
            };

            // Check for existing entry with same IP and coordinates
            const { data: existingData, error: checkError } = await this.supabase
                .from('visitors')
                .select('*')
                .eq('ip_address', dataToInsert.ip_address)
                .eq('latitude', dataToInsert.latitude)
                .eq('longitude', dataToInsert.longitude);

            if (checkError) {
                console.error('Error checking existing data:', checkError);
                throw checkError;
            }

            // If entry exists, don't insert but still add marker
            if (existingData && existingData.length > 0) {
                console.log('Entry already exists for this IP and location');
                this.addMarker(dataToInsert.latitude, dataToInsert.longitude);
                await this.fetchVisitors();
                return null;
            }

            // If no existing entry, insert new data
            console.log('No existing entry found, inserting new data...');
            const { data, error } = await this.supabase
                .from('visitors')
                .insert([dataToInsert]);

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
            
            console.log('New visitor data saved:', data);
            
            // Add marker for the new visitor
            this.addMarker(dataToInsert.latitude, dataToInsert.longitude);
            
            // Refresh the visitors list
            await this.fetchVisitors();
            return data;
            
        } catch (error) {
            console.error('Error in saveVisitorData:', error);
            throw error;
        }
    }

    async fetchVisitors() {
        try {
            const { data, error } = await this.supabase
                .from('visitors')
                .select('*')
                .order('visit_time', { ascending: false });

            if (error) throw error;

            // Clear existing markers
            this.map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    this.map.removeLayer(layer);
                }
            });

            // Add a marker for each visitor
            data.forEach(visitor => {
                const lat = parseFloat(visitor.latitude);
                const lng = parseFloat(visitor.longitude);
                
                const customIcon = L.divIcon({
                    html: `
                        <div class="marker-container">
                            <div class="marker-dot">☠️</div>
                            <div class="marker-ripple ripple-1"></div>
                            <div class="marker-ripple ripple-2"></div>
                            <div class="marker-ripple ripple-3"></div>
                        </div>
                        <style>
                            .marker-container {
                                position: relative;
                                width: 12px;
                                height: 12px;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                            }
                            .marker-dot {
                                position: absolute;
                                font-size: 12px;
                                z-index: 1000;
                            }
                            .marker-ripple {
                                position: absolute;
                                border: 1px solid #ff0000;
                                width: 12px;
                                height: 12px;
                                border-radius: 50%;
                                opacity: 0;
                                box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                            }
                            .ripple-1 {
                                animation: ripple 2s infinite ease-out;
                            }
                            .ripple-2 {
                                animation: ripple 2s infinite ease-out 0.5s;
                            }
                            .ripple-3 {
                                animation: ripple 2s infinite ease-out 1s;
                            }
                            @keyframes ripple {
                                0% {
                                    transform: scale(1);
                                    opacity: 0.8;
                                }
                                100% {
                                    transform: scale(2.5);
                                    opacity: 0;
                                }
                            }
                        </style>`,
                    className: 'custom-marker',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                L.marker([lat, lng], { icon: customIcon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div style="
                            color: #ff0000;
                            background: #000;
                            padding: 15px;
                            border: 1px solid #ff0000;
                            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                            font-family: 'Courier New', monospace;
                            min-width: 200px;
                        ">
                            <div style="
                                border-bottom: 1px solid #ff0000;
                                margin-bottom: 10px;
                                padding-bottom: 5px;
                                font-size: 14px;
                                text-shadow: 0 0 5px #ff0000;
                                text-align: center;
                            ">
                                YOUR IP IS UNDER MY CONTROL☠️
                            </div>
                            <div style="
                                font-size: 12px;
                                margin-bottom: 8px;
                                text-shadow: 0 0 3px #ff0000;
                            ">
                                <strong>LAT:</strong> ${lat}<br>
                                <strong>LNG:</strong> ${lng}
                            </div>
                            <div style="
                                font-size: 12px;
                                margin-bottom: 12px;
                                padding: 5px;
                                background: rgba(255, 0, 0, 0.1);
                                border-left: 2px solid #ff0000;
                            ">
                                <strong>PUBLIC IPv4:</strong><br>
                                <span style="
                                    color: #ff0000;
                                    text-shadow: 0 0 5px #ff0000;
                                ">${visitor.ip_address || 'Unknown'}</span>
                            </div>
                            <div style="
                                font-size: 11px;
                                text-align: center;
                                margin-top: 15px;
                                padding: 8px;
                                border: 1px dashed #ff0000;
                                background: rgba(255, 0, 0, 0.05);
                                animation: glitch 2s infinite;
                            ">
                                I DIDN'T GET YOUR ACTUAL LOCATION<br>
                                BUT I CAN MANIPULATE YOUR<br>
                                <span style="
                                    font-weight: bold;
                                    font-size: 13px;
                                    text-shadow: 0 0 8px #ff0000;
                                ">PUBLIC IPv4 ☠️</span>
                            </div>
                        </div>
                    `);
            });

            // Update the table as before
            const visitorTableBody = document.getElementById('visitor-data');
            visitorTableBody.innerHTML = '';

            data.forEach(visitor => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${parseFloat(visitor.latitude).toFixed(6)}</td>
                    <td>${parseFloat(visitor.longitude).toFixed(6)}</td>
                    <td><span style="color: #ff0000; text-shadow: 0 0 5px #ff0000;">${visitor.ip_address || 'N/A'}</span></td>
                    <td>${visitor.os || 'N/A'}</td>
                    <td>${(visitor.browser || '').substring(0, 50)}...</td>
                    <td>${visitor.device_type || 'N/A'}</td>
                    <td>${visitor.screen_resolution || 'N/A'}</td>
                    <td>${visitor.country || 'N/A'}</td>
                    <td>${visitor.isp || 'N/A'}</td>
                    <td>${new Date(visitor.visit_time).toLocaleString()}</td>
                    <td><button class="map-mode-button preview-button">PREVIEW</button></td>
                    <td><button class="map-mode-button street-view-button">STREET VIEW</button></td>
                    <td><button class="map-mode-button zoom-button">ZOOM</button></td>
                `;

                // Add event listeners for buttons
                const previewBtn = row.querySelector('.preview-button');
                previewBtn.addEventListener('click', () => {
                    const lat = parseFloat(visitor.latitude);
                    const lng = parseFloat(visitor.longitude);
                    
                    const customIcon = L.divIcon({
                        html: `
                            <div class="marker-container">
                                <div class="marker-dot">☠️</div>
                                <div class="marker-ripple ripple-1"></div>
                                <div class="marker-ripple ripple-2"></div>
                                <div class="marker-ripple ripple-3"></div>
                            </div>
                            <style>
                                .marker-container {
                                    position: relative;
                                    width: 12px;
                                    height: 12px;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                }
                                .marker-dot {
                                    position: absolute;
                                    font-size: 12px;
                                    z-index: 1000;
                                }
                                .marker-ripple {
                                    position: absolute;
                                    border: 1px solid #ff0000;
                                    width: 12px;
                                    height: 12px;
                                    border-radius: 50%;
                                    opacity: 0;
                                    box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                                }
                                .ripple-1 {
                                    animation: ripple 2s infinite ease-out;
                                }
                                .ripple-2 {
                                    animation: ripple 2s infinite ease-out 0.5s;
                                }
                                .ripple-3 {
                                    animation: ripple 2s infinite ease-out 1s;
                                }
                                @keyframes ripple {
                                    0% {
                                        transform: scale(1);
                                        opacity: 0.8;
                                    }
                                    100% {
                                        transform: scale(2.5);
                                        opacity: 0;
                                    }
                                }
                            </style>`,
                        className: 'custom-marker',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    });

                    L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
                    this.map.setView([lat, lng], 13);
                });

                const streetViewBtn = row.querySelector('.street-view-button');
                streetViewBtn.addEventListener('click', () => {
                    const lat = parseFloat(visitor.latitude);
                    const lng = parseFloat(visitor.longitude);
                    window.open(`https://www.google.com/maps?layer=c&cbll=${lat},${lng}`);
                });

                const zoomBtn = row.querySelector('.zoom-button');
                zoomBtn.addEventListener('click', () => {
                    const lat = parseFloat(visitor.latitude);
                    const lng = parseFloat(visitor.longitude);
                    this.map.setView([lat, lng], 18);
                });

                visitorTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching visitors:', error);
        }
    }
}

// Export the class for use in index.html
export default VisitorTracker; 