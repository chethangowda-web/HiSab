import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('smoke', () => {
  it('vitest is wired', () => {
    expect(1 + 1).toBe(2);
  });
  it('App renders the product name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /BoliHisab/i })).toBeTruthy();
  });
});
