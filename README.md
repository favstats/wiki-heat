# Wikipedia Heat 🔥

A static browser application that tracks engagement "heat" on any Wikipedia page using real-time signals.

![Wikipedia Heat](https://img.shields.io/badge/Vue-3.x-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **🔍 Search any Wikipedia page** - Add any page to track its engagement
- **📊 Heat Score** - Composite 0-1 score based on edit activity, reverts, editors, and more
- **📈 Trend Charts** - Visualize heat over time with interactive charts
- **👥 Editor Analysis** - See top contributors and anonymous edit ratios
- **💾 Local Storage** - All data stays in your browser, no server needed
- **🌐 Works Offline** - After initial load, works without internet

## Heat Score Formula

The heat score is calculated from these weighted signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Edit Velocity | 25% | Edits per day over 7 days |
| Revert Ratio | 20% | Percentage of reverts |
| Unique Editors | 20% | Distinct contributors (30d) |
| Talk Activity | 15% | Discussion page edits |
| Protection Level | 10% | Page restrictions |
| Anonymous Ratio | 10% | Unregistered editor % |

## Tech Stack

- **Vue 3** - Composition API
- **Vite** - Fast build tool
- **Tailwind CSS + DaisyUI** - Styling
- **Pinia** - State management with localStorage
- **Chart.js** - Data visualization
- **Lucide Icons** - Beautiful icons

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This app is designed to be deployed to GitHub Pages. Push to `main` and the GitHub Action will automatically build and deploy.

## Data Sources

- [Wikipedia MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) - Revisions, page info
- [Wikimedia Pageviews API](https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews) - Traffic data

## License

MIT
