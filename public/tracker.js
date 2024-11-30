import { createClient } from 'https://esm.sh/@supabase/supabase-js'

class VisitorTracker {
    constructor() {
        // Initialize Supabase with environment variables
        this.supabase = createClient(
            'https://miygojwoyvvwdjkjugif.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peWdvandveXZ2d2Rqa2p1Z2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NDEzMDQsImV4cCI6MjA0ODUxNzMwNH0.bjyOiSDwvTRFaBrWTGGEl4u_G2DetVnV1vE6DDmPK4E'
        );
        this.map = null; // Will be set by the map initialization in index.html
        this.trackVisitor();
    }

    async trackVisitor() {
        try {
            // Get visitor's location
            const position = await this.getCurrentPosition();
            const ipInfo = await this.getVisitorInfo();
            
            // Get device info
            const deviceInfo = {
                os: navigator.platform,
                browser: navigator.userAgent,
                deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
                screen: `${window.screen.width}x${window.screen.height}`
            };
            
            // Add marker to map
            this.addMarker(position.coords.latitude, position.coords.longitude);
            
            // Save to database
            await this.saveVisitorData({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                ip_address: ipInfo.ip,
                os: deviceInfo.os,
                browser: deviceInfo.browser,
                device_type: deviceInfo.deviceType,
                screen_resolution: deviceInfo.screen,
                country: ipInfo.country_name || 'Unknown',
                isp: ipInfo.org || 'Unknown',
                visit_time: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error tracking visitor:', error);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
    }

    async getVisitorInfo() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            return response.json();
        } catch (error) {
            console.error('Error getting IP info:', error);
            return {
                ip: 'unknown',
                country_name: 'Unknown',
                org: 'Unknown'
            };
        }
    }

    addMarker(lat, lng) {
        try {
            const customIcon = L.divIcon({
                html: `<div style="
                    background-color: #00ff00;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 10px rgba(0,255,0,0.5);
                "></div>`,
                className: 'custom-marker',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            L.marker([lat, lng], { icon: customIcon }).addTo(this.map)
                .bindPopup(`
                    <div style="color: #00ff00; background: #000; padding: 5px;">
                        <strong>Location:</strong> ${lat}, ${lng}
                    </div>
                `)
                .openPopup();
        } catch (error) {
            console.error('Error adding marker:', error);
        }
    }

    async saveVisitorData(visitorData) {
        try {
            const { data, error } = await this.supabase
                .from('visitors')
                .insert([visitorData]);

            if (error) throw error;
            console.log('Visitor data saved:', data);
            return data;
        } catch (error) {
            console.error('Error saving visitor data:', error);
        }
    }
}

// Export the class for use in index.html
export default VisitorTracker; 