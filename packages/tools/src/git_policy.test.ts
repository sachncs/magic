/**
 * @fileoverview Tests for the git policy. Covers destructive denylist
 * and allowlist behaviour.
 */

import {describe, it, expect} from 'vitest';
import {
  isDestructiveGit,
  isGitAllowed,
  parseGitSubcommand,
  checkGitCommand,
} from './git_policy.js';

describe('isDestructiveGit', () => {
  it('refuses push --force', () => {
    expect(isDestructiveGit('git push --force origin main')).toBe(true);
  });
  it('refuses push -f', () => {
    expect(isDestructiveGit('git push -f origin main')).toBe(true);
  });
  it('refuses reset --hard', () => {
    expect(isDestructiveGit('git reset --hard HEAD~1')).toBe(true);
  });
  it('refuses clean -fd', () => {
    expect(isDestructiveGit('git clean -fd')).toBe(true);
  });
  it('refuses clean -fdx', () => {
    expect(isDestructiveGit('git clean -fdx')).toBe(true);
  });
  it('refuses filter-branch', () => {
    expect(isDestructiveGit('git filter-branch --tree-filter rm HEAD')).toBe(true);
  });
  it('allows push (no force)', () => {
    expect(isDestructiveGit('git push origin main')).toBe(false);
  });
  it('allows soft reset', () => {
    expect(isDestructiveGit('git reset --soft HEAD~1')).toBe(false);
  });
  it('allows clean without -f', () => {
    expect(isDestructiveGit('git clean -n')).toBe(false);
  });
});

describe('parseGitSubcommand', () => {
  it('parses git status', () => {
    expect(parseGitSubcommand('git status')).toBe('status');
  });
  it('parses git commit -m msg', () => {
    expect(parseGitSubcommand('git commit -m "fix"')).toBe('commit');
  });
  it('parses git -C /path status', () => {
    expect(parseGitSubcommand('git -C /tmp/repo status')).toBe('status');
  });
  it('returns null for non-git', () => {
    expect(parseGitSubcommand('ls -la')).toBeNull();
  });
});

describe('isGitAllowed', () => {
  it('allows git status', () => {
    expect(isGitAllowed('git status')).toBe(true);
  });
  it('allows git diff', () => {
    expect(isGitAllowed('git diff HEAD')).toBe(true);
  });
  it('refuses git gc', () => {
    expect(isGitAllowed('git gc --prune=now')).toBe(false);
  });
  it('refuses git push (handled by denylist when --force is present)', () => {
    expect(isGitAllowed('git push origin main')).toBe(true); // allowed; force is denylist
  });
});

describe('checkGitCommand', () => {
  it('returns allow for non-git', () => {
    expect(checkGitCommand('ls -la')).toBe('allow');
  });
  it('returns allow for safe git', () => {
    expect(checkGitCommand('git status')).toBe('allow');
  });
  it('returns deny-destructive for push --force', () => {
    expect(checkGitCommand('git push --force origin main')).toBe('deny-destructive');
  });
  it('returns deny-not-allowlisted for git gc', () => {
    expect(checkGitCommand('git gc --aggressive')).toBe('deny-not-allowlisted');
  });
});
