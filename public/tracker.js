import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import dotenv from 'dotenv'

class VisitorTracker {
    constructor() {
        // Initialize Supabase with environment variables
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        this.map = this.initializeMap();
        this.trackVisitor();
    }

    initializeMap() {
        try {
            const map = L.map('map', {
                center: [12.8797, 121.7740], // Philippines center
                zoom: 6,
                minZoom: 5,
                maxZoom: 18
            });

            // Custom green theme for markers
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

            // Define map layers with DEDSEC theme
            const layers = {
                'DARK MODE': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                    attribution: 'UNDER MY CONTROL'
                }),
                'LIGHT MODE': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                    attribution: 'UNDER MY CONTROL'
                }),
                'STREET MODE': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: 'UNDER MY CONTROL'
                }),
                'SATELLITE MODE': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'UNDER MY CONTROL'
                }),
                'HIGH-LOW': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'UNDER MY CONTROL'
                })
            };

            // Set default dark mode
            layers['DARK MODE'].addTo(map);

            return map;
        } catch (error) {
            console.error('Error initializing map:', error);
        }
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

// Create a .env file and load it
dotenv.config();

// Initialize tracker when page loads
window.addEventListener('load', () => {
    new VisitorTracker();
}); 