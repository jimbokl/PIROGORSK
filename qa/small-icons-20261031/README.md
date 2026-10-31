# Pie-sun favicon verification

- Native vector mark reviewed at 16, 32 and 48 px on white and dark navy: `size-proof.png`.
- ICO contains matching PNG frames at 16/32/48 px; Apple touch icon is 180 px; transparent brand symbol is 512 px.
- Full brand regeneration preserved all 13 logo/icon output files byte for byte.
- `npm run check`: 0 errors, 0 warnings. Build: 247 HTML pages, 244 with shared icon declarations; no previous icon version in the output.
- Shared skills registry strict check: passed, no drift.
- [Production CI](https://github.com/jimbokl/PIROGORSK/actions/runs/41179213100): success for `f2ba2a7373c65842c272b86c8e018c79badfab56`, including browser tests and published release compatibility.
- Production: eight icon assets match source bytes, seven representative pages declare version `20261031-7`, and Chrome decodes all four icon links at viewport widths 390, 768 and 1440 px. Details: `production.json`.
