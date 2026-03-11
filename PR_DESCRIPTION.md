# Add Comprehensive Unit Tests for Core Engines

## Summary

This PR adds comprehensive unit tests for the four core engine modules in the project, significantly improving test coverage and ensuring code quality and reliability.

## 📊 Test Coverage

### New Test Files

1. **`src/__tests__/data-store.test.ts`** (15 tests)
   - `parseDataSync()`: JSON parsing, schema validation, error handling
   - `checkReferenceConsistency()`: Entity/Persona ID validation, reference integrity checks
   - `generateId()`: Unique ID generation with custom prefixes
   - `serializeData()`: Dataset serialization to JSON
   - **Key validations tested:**
     - Entity ID prefix validation (`e_`)
     - Persona ID prefix validation (`p_`)
     - At least one persona per entity
     - Exactly one default display persona
     - Invalid reference filtering (links, character events, relatives)

2. **`src/__tests__/relationship-engine.test.ts`** (18 tests)
   - `computeLinks()`: Link computation with cross-faction detection
   - `getCPHistory()`: Relationship event history retrieval and sorting
   - `getRelationshipKeyEvents()`: Timeline key event generation
   - **Edge cases tested:**
     - Empty link arrays
     - Missing persona references
     - Persona from same entity with different factions
     - Events without episodeIndex or chapterIndex

3. **`src/__tests__/search-engine.test.ts`** (36 tests)
   - `search()`: Multi-language fuzzy search
   - `filterByFaction()`: Faction and sub-faction filtering
   - **Search features tested:**
     - Multi-language matching (English, Chinese, Japanese, Romaji)
     - Case-insensitive search
     - Partial string matching
     - Search by codename
     - Search by nickname
     - Returns all persona IDs for matching entities
   - **Integration tests:**
     - Filter then search
     - Search then filter
     - Multi-language search on filtered results

4. **`src/__tests__/graph-adapter.test.ts`** (16 tests)
   - `computeSymbolSize()`: Symbol size calculation for graph nodes
   - `buildGraphData()` in Surface Mode: Persona-level graph construction
   - `buildGraphData()` in God Eye Mode: Entity-level graph construction
   - **Features tested:**
     - Node creation and categorization (RED, BLACK, OTHER, DUAL)
     - Edge creation and deduplication
     - Faction filtering
     - Avatar URL resolution with BASE_URL
     - Default display persona selection
     - Chinese name fallback to English

## 🎯 Test Results

```
✓ src/__tests__/relationship-engine.test.ts (18 tests) 4ms
✓ src/__tests__/search-engine.test.ts (36 tests) 7ms
✓ src/__tests__/graph-adapter.test.ts (16 tests) 4ms
✓ src/__tests__/unit/data-debug-view.test.ts (4 tests) 30ms
✓ src/__tests__/data-store.test.ts (15 tests) 47ms

Test Files: 5 passed (5)
Tests: 89 passed (89)
Duration: 881ms
```

## 🔍 Testing Approach

### Data-Store Tests
- **Mock Schema**: Created a comprehensive JSON Schema for validation testing
- **Error Scenarios**: Test both parsing errors and schema validation errors
- **Reference Integrity**: Verify invalid references are filtered and warnings generated
- **ID Validation**: Ensure proper ID prefix conventions

### Relationship-Engine Tests
- **Cross-Faction Detection**: Verify correct identification of RED-BLACK relationships
- **Chronological Sorting**: Test event ordering by episode and chapter indices
- **Empty Collections**: Handle edge cases with empty arrays
- **Complex Scenarios**: Test dual-persona entities (e.g., Akai Shuichi/Furuya Rei)

### Search-Engine Tests
- **Multi-Language Support**: Test English, Chinese, Japanese, and Romaji
- **Fuzzy Matching**: Verify case-insensitive partial string matching
- **Multiple Search Fields**: True names, persona names, codenames, nicknames
- **Filter Integration**: Test search and filter working together

### Graph-Adapter Tests
- **Mock Environment**: Set up `import.meta.env.BASE_URL` for consistent testing
- **Dual Modes**: Test both Surface Mode (personas) and God Eye Mode (entities)
- **Node Properties**: Verify category, size, name, and avatar properties
- **Edge Logic**: Test edge creation, deduplication, and filtering

## 📝 Test Coverage

The new tests cover:

- ✅ **Core Business Logic**: All four engine modules are now fully tested
- ✅ **Error Handling**: Invalid inputs and edge cases are tested
- ✅ **Data Validation**: Schema validation and reference consistency
- ✅ **Integration Scenarios**: Multi-language search and faction filtering
- ✅ **UI Components**: Graph data generation for both display modes

## 🛠️ Technical Details

### Test Framework
- **Vitest**: Fast unit test framework with built-in watch mode
- **jsdom**: DOM environment for testing (configured in vite.config.ts)
- **vi**: Vitest's built-in mocking utility

### Mocking Strategy
- **`import.meta.env`**: Stubbed for consistent BASE_URL across tests
- **JSON Schema**: Hand-coded mock schema for data validation tests
- **Test Data**: Comprehensive mock data with realistic Conan character entities

### Best Practices
- **Descriptive Test Names**: Clear, action-oriented test descriptions
- **AAA Pattern**: Arrange-Act-Assert structure in tests
- **Edge Cases**: Empty arrays, null values, and invalid inputs tested
- **Maintainability**: Mock data defined at top level for easy updates

## 📂 Files Changed

### New Files
- `src/__tests__/data-store.test.ts`
- `src/__tests__/relationship-engine.test.ts`
- `src/__tests__/search-engine.test.ts`
- `src/__tests__/graph-adapter.test.ts`

### No Breaking Changes
- All tests are non-invasive additions
- No changes to production code
- Existing functionality preserved

## 🚀 Future Improvements

Potential areas for additional test coverage:
1. **Component Tests**: Test React components with @testing-library/react
2. **Integration Tests**: End-to-end workflow tests
3. **Property Tests**: Use fast-check for generative testing
4. **E2E Tests**: Playwright tests for full user flows
5. **Performance Tests**: Benchmark graph rendering with large datasets

## ✅ Checklist

- [x] All tests pass (89/89)
- [x] Tests follow the project's coding style
- [x] Mock data is realistic and comprehensive
- [x] Edge cases are covered
- [x] No changes to production code
- [x] Documentation included in this PR

## 📋 Related Issues

Closes: Testing Coverage Gap
References: GitHub Issue on code quality improvement

---

**Note**: This PR establishes a solid foundation for test coverage. Future contributions should maintain or improve this test coverage when adding new features or modifying existing code.
