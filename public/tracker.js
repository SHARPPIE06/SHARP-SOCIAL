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
                            width: 20px;
                            height: 20px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            transform: translate(-50%, -50%);
                        }
                        .marker-dot {
                            position: absolute;
                            font-size: 16px;
                            z-index: 1000;
                            left: 50%;
                            top: 50%;
                            transform: translate(-50%, -50%);
                        }
                        .marker-ripple {
                            position: absolute;
                            border: 1px solid #ff0000;
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            opacity: 0;
                            box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                            left: 50%;
                            top: 50%;
                            transform: translate(-50%, -50%);
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
                                transform: translate(-50%, -50%) scale(1);
                                opacity: 0.8;
                            }
                            100% {
                                transform: translate(-50%, -50%) scale(2.5);
                                opacity: 0;
                            }
                        }
                    </style>`,
                className: 'custom-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            L.marker([lat, lng], { icon: customIcon }).addTo(this.map)
                .bindPopup(`
                    <div class="hacker-popup">
                        <div class="scan-line"></div>
                        <div class="terminal-text">
                            <div class="header">
                                > SYSTEM BREACH DETECTED_<span class="blink">█</span>
                            </div>
                            <div class="content typing-effect">
                                <div class="data-row">[LAT]: ${lat}</div>
                                <div class="data-row">[LNG]: ${lng}</div>
                                <div class="data-row">[IPv4]: ${this.ipInfo?.ip || 'Unknown'}</div>
                            </div>
                            <div class="warning">
                                <span class="glitch-text" data-text="I DIDN'T GET YOUR ACTUAL LOCATION">I DIDN'T GET YOUR ACTUAL LOCATION</span><br>
                                <span class="glitch-text" data-text="BUT I CAN MANIPULATE YOUR">BUT I CAN MANIPULATE YOUR</span><br>
                                <span class="danger-text">PUBLIC IPv4 ☠️</span>
                            </div>
                        </div>
                    </div>
                    <style>
                        .hacker-popup {
                            color: #0f0;
                            background: #000;
                            padding: 15px;
                            border: 1px solid #0f0;
                            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                            font-family: 'Courier New', monospace;
                            min-width: 250px;
                            position: relative;
                            overflow: hidden;
                        }

                        .scan-line {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            height: 4px;
                            background: rgba(0, 255, 0, 0.2);
                            animation: scanning 2s linear infinite;
                        }

                        .terminal-text {
                            position: relative;
                            z-index: 1;
                        }

                        .header {
                            border-bottom: 1px solid #0f0;
                            padding-bottom: 8px;
                            margin-bottom: 12px;
                            font-size: 14px;
                            text-shadow: 0 0 5px #0f0;
                        }

                        .content {
                            margin: 10px 0;
                        }

                        .data-row {
                            margin: 5px 0;
                            opacity: 0;
                            animation: typeIn 0.5s forwards;
                        }

                        .data-row:nth-child(1) { animation-delay: 0.5s; }
                        .data-row:nth-child(2) { animation-delay: 1s; }
                        .data-row:nth-child(3) { animation-delay: 1.5s; }

                        .warning {
                            margin-top: 15px;
                            padding: 8px;
                            border: 1px dashed #f00;
                            background: rgba(255, 0, 0, 0.1);
                            color: #f00;
                        }

                        .danger-text {
                            display: block;
                            font-weight: bold;
                            font-size: 13px;
                            text-shadow: 0 0 8px #f00;
                            animation: pulse 1.5s infinite;
                        }

                        .blink {
                            animation: blink 1s infinite;
                        }

                        @keyframes scanning {
                            0% { transform: translateY(-100%); }
                            100% { transform: translateY(1000%); }
                        }

                        @keyframes typeIn {
                            from {
                                opacity: 0;
                                transform: translateX(-10px);
                            }
                            to {
                                opacity: 1;
                                transform: translateX(0);
                            }
                        }

                        @keyframes blink {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0; }
                        }

                        @keyframes pulse {
                            0% { text-shadow: 0 0 5px #f00; }
                            50% { text-shadow: 0 0 20px #f00; }
                            100% { text-shadow: 0 0 5px #f00; }
                        }

                        .glitch-text {
                            position: relative;
                            animation: glitch-skew 1s infinite linear alternate-reverse;
                            color: #f00;
                        }

                        .glitch-text::before,
                        .glitch-text::after {
                            content: attr(data-text);
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                        }

                        .glitch-text::before {
                            left: 2px;
                            text-shadow: -2px 0 #0f0;
                            clip: rect(44px, 450px, 56px, 0);
                            animation: glitch-anim 5s infinite linear alternate-reverse;
                        }

                        .glitch-text::after {
                            left: -2px;
                            text-shadow: -2px 0 #00f;
                            clip: rect(44px, 450px, 56px, 0);
                            animation: glitch-anim2 5s infinite linear alternate-reverse;
                        }

                        @keyframes glitch-anim {
                            0% { clip: rect(31px, 9999px, 94px, 0); transform: skew(0.85deg); }
                            20% { clip: rect(89px, 9999px, 6px, 0); transform: skew(0.01deg); }
                            40% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.13deg); }
                            60% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.44deg); }
                            80% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.13deg); }
                            100% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.95deg); }
                        }

                        @keyframes glitch-anim2 {
                            0% { clip: rect(65px, 9999px, 99px, 0); transform: skew(0.13deg); }
                            20% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.95deg); }
                            40% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.46deg); }
                            60% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.34deg); }
                            80% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.46deg); }
                            100% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.83deg); }
                        }

                        @keyframes glitch-skew {
                            0% { transform: skew(-2deg); }
                            20% { transform: skew(1deg); }
                            40% { transform: skew(-2deg); }
                            60% { transform: skew(-2deg); }
                            80% { transform: skew(1deg); }
                            100% { transform: skew(-2deg); }
                        }
                    </style>
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
                                width: 20px;
                                height: 20px;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                transform: translate(-50%, -50%);
                            }
                            .marker-dot {
                                position: absolute;
                                font-size: 16px;
                                z-index: 1000;
                                left: 50%;
                                top: 50%;
                                transform: translate(-50%, -50%);
                            }
                            .marker-ripple {
                                position: absolute;
                                border: 1px solid #ff0000;
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                opacity: 0;
                                box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                                left: 50%;
                                top: 50%;
                                transform: translate(-50%, -50%);
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
                                    transform: translate(-50%, -50%) scale(1);
                                    opacity: 0.8;
                                }
                                100% {
                                    transform: translate(-50%, -50%) scale(2.5);
                                    opacity: 0;
                                }
                            }
                        </style>`,
                    className: 'custom-marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                L.marker([lat, lng], { icon: customIcon })
                    .addTo(this.map)
                    .bindPopup(`
                        <div class="hacker-popup">
                            <div class="scan-line"></div>
                            <div class="terminal-text">
                                <div class="header">
                                    > SYSTEM BREACH DETECTED_<span class="blink">█</span>
                                </div>
                                <div class="content typing-effect">
                                    <div class="data-row">[LAT]: ${lat}</div>
                                    <div class="data-row">[LNG]: ${lng}</div>
                                    <div class="data-row">[IPv4]: ${visitor.ip_address || 'Unknown'}</div>
                                </div>
                                <div class="warning">
                                    <span class="glitch-text" data-text="I DIDN'T GET YOUR ACTUAL LOCATION">I DIDN'T GET YOUR ACTUAL LOCATION</span><br>
                                    <span class="glitch-text" data-text="BUT I CAN MANIPULATE YOUR">BUT I CAN MANIPULATE YOUR</span><br>
                                    <span class="danger-text">PUBLIC IPv4 ☠️</span>
                                </div>
                            </div>
                        </div>
                        <style>
                            .hacker-popup {
                                color: #0f0;
                                background: #000;
                                padding: 15px;
                                border: 1px solid #0f0;
                                box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                                font-family: 'Courier New', monospace;
                                min-width: 250px;
                                position: relative;
                                overflow: hidden;
                            }

                            .scan-line {
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                height: 4px;
                                background: rgba(0, 255, 0, 0.2);
                                animation: scanning 2s linear infinite;
                            }

                            .terminal-text {
                                position: relative;
                                z-index: 1;
                            }

                            .header {
                                border-bottom: 1px solid #0f0;
                                padding-bottom: 8px;
                                margin-bottom: 12px;
                                font-size: 14px;
                                text-shadow: 0 0 5px #0f0;
                            }

                            .content {
                                margin: 10px 0;
                            }

                            .data-row {
                                margin: 5px 0;
                                opacity: 0;
                                animation: typeIn 0.5s forwards;
                            }

                            .data-row:nth-child(1) { animation-delay: 0.5s; }
                            .data-row:nth-child(2) { animation-delay: 1s; }
                            .data-row:nth-child(3) { animation-delay: 1.5s; }

                            .warning {
                                margin-top: 15px;
                                padding: 8px;
                                border: 1px dashed #f00;
                                background: rgba(255, 0, 0, 0.1);
                                color: #f00;
                            }

                            .danger-text {
                                display: block;
                                font-weight: bold;
                                font-size: 13px;
                                text-shadow: 0 0 8px #f00;
                                animation: pulse 1.5s infinite;
                            }

                            .blink {
                                animation: blink 1s infinite;
                            }

                            @keyframes scanning {
                                0% { transform: translateY(-100%); }
                                100% { transform: translateY(1000%); }
                            }

                            @keyframes typeIn {
                                from {
                                    opacity: 0;
                                    transform: translateX(-10px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateX(0);
                                }
                            }

                            @keyframes blink {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0; }
                            }

                            @keyframes pulse {
                                0% { text-shadow: 0 0 5px #f00; }
                                50% { text-shadow: 0 0 20px #f00; }
                                100% { text-shadow: 0 0 5px #f00; }
                            }

                            .glitch-text {
                                position: relative;
                                animation: glitch-skew 1s infinite linear alternate-reverse;
                                color: #f00;
                            }

                            .glitch-text::before,
                            .glitch-text::after {
                                content: attr(data-text);
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                            }

                            .glitch-text::before {
                                left: 2px;
                                text-shadow: -2px 0 #0f0;
                                clip: rect(44px, 450px, 56px, 0);
                                animation: glitch-anim 5s infinite linear alternate-reverse;
                            }

                            .glitch-text::after {
                                left: -2px;
                                text-shadow: -2px 0 #00f;
                                clip: rect(44px, 450px, 56px, 0);
                                animation: glitch-anim2 5s infinite linear alternate-reverse;
                            }

                            @keyframes glitch-anim {
                                0% { clip: rect(31px, 9999px, 94px, 0); transform: skew(0.85deg); }
                                20% { clip: rect(89px, 9999px, 6px, 0); transform: skew(0.01deg); }
                                40% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.13deg); }
                                60% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.44deg); }
                                80% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.13deg); }
                                100% { clip: rect(90px, 9999px, 89px, 0); transform: skew(0.95deg); }
                            }

                            @keyframes glitch-anim2 {
                                0% { clip: rect(65px, 9999px, 99px, 0); transform: skew(0.13deg); }
                                20% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.95deg); }
                                40% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.46deg); }
                                60% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.34deg); }
                                80% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.46deg); }
                                100% { clip: rect(72px, 9999px, 22px, 0); transform: skew(0.83deg); }
                            }

                            @keyframes glitch-skew {
                                0% { transform: skew(-2deg); }
                                20% { transform: skew(1deg); }
                                40% { transform: skew(-2deg); }
                                60% { transform: skew(-2deg); }
                                80% { transform: skew(1deg); }
                                100% { transform: skew(-2deg); }
                            }
                        </style>
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
                                    width: 20px;
                                    height: 20px;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    transform: translate(-50%, -50%);
                                }
                                .marker-dot {
                                    position: absolute;
                                    font-size: 16px;
                                    z-index: 1000;
                                    left: 50%;
                                    top: 50%;
                                    transform: translate(-50%, -50%);
                                }
                                .marker-ripple {
                                    position: absolute;
                                    border: 1px solid #ff0000;
                                    width: 20px;
                                    height: 20px;
                                    border-radius: 50%;
                                    opacity: 0;
                                    box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                                    left: 50%;
                                    top: 50%;
                                    transform: translate(-50%, -50%);
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
                                        transform: translate(-50%, -50%) scale(1);
                                        opacity: 0.8;
                                    }
                                    100% {
                                        transform: translate(-50%, -50%) scale(2.5);
                                        opacity: 0;
                                    }
                                }
                            </style>`,
                        className: 'custom-marker',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
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