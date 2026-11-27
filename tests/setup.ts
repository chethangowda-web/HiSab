import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// jsdom runs 27 files in parallel; under that load a screen can take over 1 s to settle.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => cleanup());
