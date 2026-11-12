# Test fixtures

`route_agm_2025.pdf` — Route Mobile Limited, notice of the 21st Annual General Meeting
(2025). A public listed-company disclosure, copied byte for byte from the backend's
`corpus/testdocs/_raw/route_agm_2025.pdf`. Its fonts are CID-encoded: the hand-written PDF
reader refused it as unreadable, and `tests/documents.test.ts` pins that it now reads.
