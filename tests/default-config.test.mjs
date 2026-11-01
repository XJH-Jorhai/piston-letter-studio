import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFAULT_CONFIG} from '../src/default-config.js';
import {normalizeConfig} from '../src/piston-letters.js';

test('generator default exactly matches the approved 0.94s configuration',()=>{
  const approved=JSON.parse(fs.readFileSync(new URL('../assets/presets/minecraft-original-0.94s.json',import.meta.url),'utf8')).config;
  assert.deepEqual(DEFAULT_CONFIG,approved);
  assert.deepEqual(normalizeConfig(DEFAULT_CONFIG),approved);
  assert.equal(DEFAULT_CONFIG.mode,'minecraft');
  assert.equal(DEFAULT_CONFIG.period,.94);
  assert.equal(DEFAULT_CONFIG.stroke,100);
  assert.equal(DEFAULT_CONFIG.background,'transparent');
});
