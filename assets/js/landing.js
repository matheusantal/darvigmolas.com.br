
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-secondary-container": "#5d6466",
                        "primary-fixed-dim": "#ffb785",
                        "tertiary-container": "#9ea166",
                        "outline": "#8a7264",
                        "background": "#f7faf9",
                        "on-secondary": "#ffffff",
                        "secondary-container": "#dae1e3",
                        "on-error": "#ffffff",
                        "secondary-fixed-dim": "#c1c8ca",
                        "surface-bright": "#f7faf9",
                        "on-background": "#181c1c",
                        "surface-container": "#ebeeed",
                        "tertiary-fixed": "#e4e7a6",
                        "on-secondary-fixed": "#161d1f",
                        "surface": "#f7faf9",
                        "inverse-surface": "#2d3131",
                        "tertiary": "#5f622e",
                        "surface-container-highest": "#e0e3e2",
                        "on-surface-variant": "#564336",
                        "on-surface": "#181c1c",
                        "on-primary": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "surface-variant": "#e0e3e2",
                        "on-primary-fixed": "#301400",
                        "surface-container-high": "#e6e9e8",
                        "surface-dim": "#d7dbda",
                        "error": "#ba1a1a",
                        "on-error-container": "#93000a",
                        "primary-container": "#954a00",
                        "on-tertiary-container": "#343707",
                        "primary-fixed": "#ffdcc6",
                        "on-tertiary-fixed-variant": "#474a18",
                        "inverse-primary": "#ffb785",
                        "surface-container-low": "#f1f4f3",
                        "primary": "#954a00",
                        "error-container": "#ffdad6",
                        "on-secondary-fixed-variant": "#41484a",
                        "on-tertiary-fixed": "#1b1d00",
                        "secondary": "#586062",
                        "outline-variant": "#ddc1b0",
                        "tertiary-fixed-dim": "#c8cb8c",
                        "on-primary-container": "#ffffff",
                        "surface-tint": "#954a00",
                        "secondary-fixed": "#dde4e6",
                        "inverse-on-surface": "#eef1f0",
                        "on-primary-fixed-variant": "#713700",
                        "on-tertiary": "#ffffff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-mobile": "16px",
                        "base": "8px",
                        "container-max": "1280px",
                        "margin-desktop": "48px",
                        "gutter": "24px"
                    },
                    "fontFamily": {
                        "label-caps": ["JetBrains Mono"],
                        "headline-md": ["Metropolis"],
                        "body-lg": ["Inter"],
                        "headline-sm": ["Metropolis"],
                        "display-lg": ["Metropolis"],
                        "body-md": ["Inter"],
                        "display-lg-mobile": ["Metropolis"],
                        "button": ["Inter"]
                    },
                    "fontSize": {
                        "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.1em", "fontWeight": "600" }],
                        "headline-md": ["32px", { "lineHeight": "40px", "fontWeight": "600" }],
                        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
                        "headline-sm": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
                        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                        "display-lg-mobile": ["36px", { "lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "button": ["14px", { "lineHeight": "20px", "fontWeight": "600" }]
                    }
                }
            }
        }
    
;

        document.addEventListener('DOMContentLoaded', () => {
            // Apply fade-in on load
            setTimeout(() => {
                document.body.classList.add('page-fade-in');
            }, 50);

            // Handle internal link clicks for fade-out
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (!link) return;

                const href = link.getAttribute('href');
                const target = link.getAttribute('target');

                // Filter for internal pages (e.g. .html or relative paths) but exclude anchors and external links
                if (href && (href.includes('.html') || href.startsWith('/') || href.startsWith('./')) && 
                    !href.startsWith('#') && target !== '_blank' && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                    
                    e.preventDefault();
                    document.body.classList.add('page-fade-out');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 400);
                }
            });
        });
    