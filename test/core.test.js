
import test from'node:test';import assert from'node:assert/strict';import{normalizePage,auditPage,buildBrief,jsonLd,exportHtml}from'../src/core.js';
test('normalizes page',()=>{const p=normalizePage({title:' x ',entities:'AI, SEO'});assert.equal(p.title,'x');assert.deepEqual(p.entities,['AI','SEO'])});
test('audit rewards evidence and direct answer',()=>{const p=normalizePage({title:'AI検索に強いコンテンツを作る実践ガイド',query:'AI検索',answer:'a'.repeat(100),body:'## A\n'+('本文。'.repeat(400))+'\n## B\n本文',author:'A',experience:'tested',entities:['AI','SEO'],internalLinks:['/a','/b'],sources:[{label:'a',url:'https://a.test'},{label:'b',url:'https://b.test'}],schema:['Article']});assert.equal(auditPage(p).score,100)});
test('brief is usable markdown',()=>{assert.match(buildBrief({query:'SEO',audience:'編集者'}).body,/## 実践手順/)});
test('structured data maps author',()=>{assert.equal(jsonLd(normalizePage({title:'x',author:'阿部'})).author.name,'阿部')});
test('html export escapes input',()=>{assert.match(exportHtml(normalizePage({title:'<x>',answer:'ok'})),/&lt;x&gt;/)});

