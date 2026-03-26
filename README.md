# 名侦探柯南 — 红黑阵营可视化工具

> 真相只有一个

A comprehensive visualization tool for tracking character factions, relationships, and story arcs in Detective Conan (Case Closed).

## 🎯 Features

- **ECharts Force-Directed Graph**: Interactive network visualization of character relationships using ECharts
- **Circular Avatar Nodes**: Character avatars displayed as circular nodes with faction-colored borders (red for Justice, gray for Organization)
- **Character Faction Tracking**: Visualize RED (Justice) vs BLACK (Organization) faction members
- **Dual Identity Support**: Track undercover agents and their multiple identities (Surface Mode / God Eye Mode)
- **Faction Filter Sidebar**: Toggle visibility of factions and sub-factions
- **Relationship Mapping**: Explore romantic, rivalry, friendship, and other relationships between characters
- **APTX-4869 Timeline Slider**: Navigate through time with an iconic capsule-shaped slider
- **Timeline Navigation**: Navigate through episodes, manga chapters, and publication dates
- **Story Arc Visualization**: See major plot developments across different arcs
- **Interactive Interface**: Search, filter, and explore character connections
- **Adjacency Highlight**: Hover a node to spotlight its direct connections

## 🚀 Live Demo

Visit the live application: [https://yuchengmautk.github.io/conan-faction-visualizer/](https://yuchengmautk.github.io/conan-faction-visualizer/)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (required for wiki scraper scripts)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YuchengMaUTK/conan-faction-visualizer.git
cd conan-faction-visualizer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173/conan-faction-visualizer/](http://localhost:5173/conan-faction-visualizer/) to view the application.

### Building for Production

```bash
npm run build
npm run preview
```

## 🌟 Special Features

### APTX-4869 Timeline Slider
Navigate through the Detective Conan timeline using an interactive capsule-shaped slider that mimics the iconic APTX-4869 poison from the series. The red and white capsule design provides an immersive way to explore different time periods in the story.

### Multi-mode Timeline
- **Episode Mode**: Navigate by anime episode numbers
- **Chapter Mode**: Navigate by manga chapter numbers  
- **Date Mode**: Navigate by publication dates

### Interactive Relationship Visualization
- Same-faction relationships displayed within faction panels
- Cross-faction relationships shown in a dedicated section
- Dynamic relationship lines with hover effects and status indicators

## 📊 Data Structure

The visualization is powered by a comprehensive JSON dataset that includes:

- **Characters**: Faction affiliations, codenames, appearance counts
- **Character Events**: Join/leave events, deaths, identity exposures
- **Relationships**: Romantic connections between characters
- **Episode Mappings**: Anime-to-manga chapter correlations
- **Story Arcs**: Major plot developments and timelines

See `public/conan-data-schema.json` for the complete data schema.

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npx tsx scripts/scrape-wiki-entities.ts` - Auto-discover characters from wiki, scrape details (i18n names, avatars, appearances), and merge into dataset
- `npx tsx scripts/download-avatars.ts` - Re-download character avatars from wiki
- `npx tsx scripts/scrape-avatars.ts` - Update avatar URLs from wiki
- `npx tsx scripts/scrape-appearances.ts` - Update appearance counts from wiki

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Visualization**: ECharts 6 (Force-Directed Graph)
- **Build Tool**: Vite
- **State Management**: Zustand
- **Testing**: Vitest + Testing Library + fast-check
- **Validation**: AJV (JSON Schema)
- **Web Scraping**: Cheerio + p-limit (concurrent rate-limited wiki scraping)

### Project Structure

```
src/
├── components/          # React components
│   ├── Visualizer.tsx   # Main visualization orchestrator
│   ├── ForceGraph.tsx   # ECharts force-directed graph with circular avatars
│   ├── FactionFilterSidebar.tsx  # Faction/sub-faction toggle filters
│   ├── GodEyeToggle.tsx # Surface / God Eye mode switch
│   ├── CharacterCard.tsx
│   └── ...
├── engines/             # Core logic engines
│   ├── data-store.ts    # Data loading & validation
│   ├── graph-adapter.ts # ECharts graph data adapter
│   ├── relationship-engine.ts
│   ├── search-engine.ts
│   └── ...
├── store/               # Zustand state management
├── types/               # TypeScript definitions
└── __tests__/           # Test files
scripts/
├── download-avatars.ts  # Download & localize character avatars
└── ...
```

## 📝 Data Sources

This project aggregates information from:
- Detective Conan manga chapters
- Anime episode adaptations
- Character relationship analysis
- Story arc categorization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Adding New Data

1. Update the JSON data files in `public/`
2. Ensure data follows the schema in `conan-data-schema.json`
3. Test the visualization with new data
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Detective Conan series by Gosho Aoyama
- Community contributors for character and relationship data
- Open source libraries that made this project possible

---

**Note**: This is a fan-made visualization tool created for educational and entertainment purposes. All Detective Conan characters and story elements are the property of Gosho Aoyama and respective publishers.