const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const window = {};
const context = {window};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/topics.js'),'utf8'),context);
const enrichmentPath = path.join(root,'src/library/learning-cards.js');
vm.runInNewContext(fs.readFileSync(enrichmentPath,'utf8'),context);
for(const name of ['extended-core','extended-systems']) vm.runInNewContext(fs.readFileSync(path.join(root,'src/library',name+'.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/practice-bridge.js'),'utf8'),context);
const bridge = window.BioPractice;

test('every topic keeps its exact concept and explanation mode across Learn, Reason and Solve',()=>{
  for (const topic of window.BIO_LIBRARY.topics) for(const mode of ['layman','intuition','visual','scientific','advanced','realWorld']) {
    const route = bridge.parseRoute('#learn/'+topic.id+'/'+mode);
    assert.equal(route.topic.id,topic.id); assert.equal(route.mode,mode);
    assert.equal(bridge.href('learn',topic.id,mode),'./learn.html#topic/'+topic.id+'/'+mode);
    assert.equal(bridge.href('reason',topic.id,mode),'./reason.html#learn/'+topic.id+'/'+mode);
    assert.equal(bridge.href('solve',topic.id,mode),'./solve.html#learn/'+topic.id+'/'+mode);
  }
});

test('unknown or malformed routes cannot become a topic practice session',()=>{
  for(const hash of ['#learn/not-a-topic/visual','#learn/../../visual','#learn/photosynthesis/visual/extra','#topic/photosynthesis/visual']) assert.equal(bridge.parseRoute(hash),null);
  assert.equal(bridge.parseRoute('#learn/photosynthesis/noSuchMode').mode,'layman');
});

test('practice preserves the authored correct answer and does not duplicate questions',()=>{
  for(const topic of window.BIO_LIBRARY.topics) {
    const questions = bridge.questionsFor(topic);
    assert.ok(questions.length>=1,topic.id);
    assert.equal(new Set(questions.map(q=>q.question)).size,questions.length,topic.id);
    for(const q of questions) assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,topic.id);
    assert.equal(questions.length,3,topic.id+' should combine its original check and two new checkpoints');
  }
});

test('answer restoration rejects stale options, invalid indices and malformed saved states',()=>{
  const questions = bridge.questionsFor(window.BIO_LIBRARY.topics[0]);
  const q = questions[0], signature = JSON.stringify(q.options)+':'+q.answer;
  const good = {question:q.question,signature,choice:1,checked:true};
  assert.equal(bridge.validateAnswers([good],questions)[0].choice,1);
  assert.equal(bridge.validateAnswers([{...good,choice:1000}],questions)[0],null);
  assert.equal(bridge.validateAnswers([{...good,signature:'old order'}],questions)[0],null);
  assert.equal(bridge.validateAnswers([{...good,question:'changed question'}],questions)[0],null);
  assert.equal(bridge.validateAnswers({bad:true},questions)[0],null);
  assert.equal(bridge.validateAnswers('bad',questions)[0],null);
});
