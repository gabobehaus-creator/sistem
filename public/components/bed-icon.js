class BedIcon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    static get observedAttributes() {
        return ['type', 'color'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const type = this.getAttribute('type') || 'single'; // Default to single
        const color = this.getAttribute('color') || 'gray'; // Default to gray

        let svgPath = '';
        // Define SVG paths for different bed types
        switch (type) {
            case 'double': // Matrimonial / Executive / Loft often imply double or larger
                svgPath = '<path d="M20 10V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v3c-1.1 0-2 .9-2 2v5h1.33L3 19h1l.67-2h12.67l.66 2h1l.67-2H22v-5c0-1.1-.9-2-2-2zm-2 0h-5V7h5v3zM6 7h5v3H6V7zm-2 5v3h16v-3H4z"/>';
                break;
            case 'single': // Simple / Studio
                svgPath = '<path d="M19 7h-8V3H3v18h2v-4h14v4h2v-8c0-1.1-.9-2-2-2zM5 5h4v4H5V5zm14 8H5v-2h14v2z"/>';
                break;
            case 'sofa': // Example for a sofa bed
                svgPath = '<path d="M20 10H4c-1.1 0-2 .9-2 2v5h2v-2h16v2h2v-5c0-1.1-.9-2-2-2zm0-4H4V4h16v2zM6 13h12v-2H6v2z"/>'; // Placeholder for sofa
                break;
            case 'cradle': // Cuna
                svgPath = '<path d="M12 11c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm-4 8h8v-2H8v2zm-2 0h-2c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v12zm14-2v-3c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3h2v2h2v-2h2z"/>'; // Placeholder for cradle
                break;
            default: // Default to single if type is unknown or not set
                svgPath = '<path d="M19 7h-8V3H3v18h2v-4h14v4h2v-8c0-1.1-.9-2-2-2zM5 5h4v4H5V5zm14 8H5v-2h14v2z"/>';
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: inline-block; width: 24px; height: 24px; vertical-align: middle; margin-left: 5px; }
                svg { fill: var(--icon-color, ${color}); width: 100%; height: 100%; }
                /* Dark mode compatibility */
                :host-context(html.dark-mode) svg {
                    fill: var(--text-color); /* Use general text color in dark mode */
                }
            </style>
            <svg viewBox="0 0 24 24">${svgPath}</svg>
        `;
    }
}
customElements.define('bed-icon', BedIcon);
