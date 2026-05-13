import { LitElement, html, css } from 'lit';

export class BedIcon extends LitElement {
  static properties = {
    type: { type: String }, // 'double', 'single', 'sofa', 'cradle'
    color: { type: String }
  };

  static styles = css`
    :host { display: inline-block; width: 24px; height: 24px; }
    svg { width: 100%; height: 100%; }
  `;

  constructor() {
    super();
    this.type = 'single';
    this.color = 'black';
  }

  render() {
    const icons = {
      double: `<path d="M20 10V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v3c-1.1 0-2 .9-2 2v5h1.33L3 19h1l.67-2h12.67l.66 2h1l.67-2H22v-5c0-1.1-.9-2-2-2zm-2 0h-5V7h5v3zM6 7h5v3H6V7zm-2 5v3h16v-3H4z"/>`,
      single: `<path d="M19 7h-8V3H3v18h2v-4h14v4h2v-8c0-1.1-.9-2-2-2zM5 5h4v4H5V5zm14 8H5v-2h14v2z"/>`,
      sofa: `<path d="M20 7H4c-1.1 0-2 .9-2 2v7h20v-7c0-1.1-.9-2-2-2zM4 14v-5h16l.01 5H4z"/>`,
      cradle: `<path d="M18 6h-1V4c0-1.1-.9-2-2-2H9C7.9 2 7 2.9 7 4v2H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4zm9 12H6V8h12v8z"/>`
    };

    return html`
      <svg viewBox="0 0 24 24" fill="${this.color}">
       <path d="M19 7h-8V3H3v18h2v-4h14v4h2v-8c0-1.1-.9-2-2-2zM5 5h4v4H5V5zm14 8H5v-2h14v2z"/>
      </svg>
    `;
  }
}
customElements.define('bed-icon', BedIcon);
