// Tailwind config for the landing page. Rebuild the CSS after editing classes:
//   printf '@tailwind base;@tailwind components;@tailwind utilities;' | npx tailwindcss@3 -c tailwind.config.js -i - -o public/tailwind.css --minify
module.exports = Object.assign({
            theme: {
                extend: {
                    colors: {
                        'ibc-navy': '#1B2430',      // Deep Navy
                        'ibc-darkNavy': '#111827',  // Almost Black
                        'ibc-gold': '#D4AF37',      // Metallic Gold
                        'ibc-cream': '#F9F5F0',     // Soft Cream Background
                        'ibc-slate': '#4B5563',     // Slate Text
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    }
                }
            }
        }, { content: ['./public/index.html'] });
