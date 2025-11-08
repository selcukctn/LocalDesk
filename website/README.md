# Local Desk Website

Responsive landing page for Local Desk application built with Vite + React + JSX.

## Features

- 🌍 Multi-language support (English, Turkish, German)
- 📱 Fully responsive design
- 🎨 Dark theme matching Local Desk desktop app
- ⚡ Fast and modern with Vite
- 🎯 Smooth scrolling navigation

## Getting Started

### Installation

```bash
cd website
npm install
```

### Development

```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Features.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── Screenshots.jsx
│   │   └── Footer.jsx
│   ├── locales/
│   │   ├── en.json
│   │   ├── tr.json
│   │   └── de.json
│   ├── App.jsx
│   ├── main.jsx
│   ├── i18n.js
│   └── styles.css
├── public/
│   └── image/
│       └── buymecoffee.png
├── index.html
├── package.json
└── vite.config.js
```

## Customization

### Colors

Edit CSS variables in `src/styles.css`:

```css
:root {
  --bg: #1e1e1e;
  --text: #cccccc;
  --primary: #1F6FEB;
  --secondary: #2d2d30;
  --card-bg: #252526;
}
```

### Translations

Edit JSON files in `src/locales/` to update text content.

## Technologies

- React 18
- Vite 5
- i18next & react-i18next
- CSS3 (Custom Properties)

