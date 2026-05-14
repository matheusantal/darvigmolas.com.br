
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "tertiary-container": "#9ea166",
                      "surface-container": "#ebeeed",
                      "secondary-fixed": "#dde4e6",
                      "inverse-primary": "#ffb785",
                      "tertiary-fixed": "#e4e7a6",
                      "primary-container": "#ef7f1a",
                      "on-tertiary-fixed-variant": "#474a18",
                      "on-error": "#ffffff",
                      "on-surface": "#181c1c",
                      "surface-dim": "#d7dbda",
                      "on-secondary": "#ffffff",
                      "primary-fixed": "#ffdcc6",
                      "error-container": "#ffdad6",
                      "tertiary-fixed-dim": "#c8cb8c",
                      "surface-container-lowest": "#ffffff",
                      "secondary": "#586062",
                      "inverse-on-surface": "#eef1f0",
                      "primary": "#954a00",
                      "on-secondary-fixed": "#161d1f",
                      "surface-container-highest": "#e0e3e2",
                      "on-surface-variant": "#564336",
                      "on-error-container": "#93000a",
                      "on-tertiary": "#ffffff",
                      "tertiary": "#5f622e",
                      "on-primary-container": "#562800",
                      "surface": "#f7faf9",
                      "secondary-fixed-dim": "#c1c8ca",
                      "inverse-surface": "#2d3131",
                      "on-primary-fixed-variant": "#713700",
                      "on-secondary-fixed-variant": "#41484a",
                      "background": "#f7faf9",
                      "outline": "#8a7264",
                      "surface-bright": "#f7faf9",
                      "on-tertiary-container": "#343707",
                      "surface-tint": "#954a00",
                      "primary-fixed-dim": "#ffb785",
                      "surface-variant": "#e0e3e2",
                      "surface-container-high": "#e6e9e8",
                      "on-tertiary-fixed": "#1b1d00",
                      "error": "#ba1a1a",
                      "on-secondary-container": "#5d6466",
                      "surface-container-low": "#f1f4f3",
                      "outline-variant": "#ddc1b0",
                      "on-primary-fixed": "#301400",
                      "on-background": "#181c1c",
                      "secondary-container": "#dae1e3",
                      "on-primary": "#ffffff"
              },
              "borderRadius": {
                      "DEFAULT": "0.25rem",
                      "lg": "0.5rem",
                      "xl": "0.75rem",
                      "full": "9999px"
              },
              "spacing": {
                      "margin-desktop": "48px",
                      "gutter": "24px",
                      "container-max": "1280px",
                      "base": "8px",
                      "margin-mobile": "16px"
              },
              "fontFamily": {
                      "headline-sm": ["Metropolis"],
                      "display-lg-mobile": ["Metropolis"],
                      "display-lg": ["Metropolis"],
                      "body-md": ["Inter"],
                      "button": ["Inter"],
                      "label-caps": ["JetBrains Mono"],
                      "headline-md": ["Metropolis"],
                      "body-lg": ["Inter"]
              },
              "fontSize": {
                      "headline-sm": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
                      "display-lg-mobile": ["36px", {"lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                      "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                      "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                      "button": ["14px", {"lineHeight": "20px", "fontWeight": "600"}],
                      "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.1em", "fontWeight": "600"}],
                      "headline-md": ["32px", {"lineHeight": "40px", "fontWeight": "600"}],
                      "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
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
    