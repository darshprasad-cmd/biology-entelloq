// This worker serves one fixed BERT encoder. Import its upstream source modules
// directly so the generic pipeline's registry and unrelated model classes are
// not bundled. The exact Transformers.js version is pinned in package-lock.json.
import { BertModel } from '../node_modules/@huggingface/transformers/src/models/bert/modeling_bert.js';
import { BertTokenizer } from '../node_modules/@huggingface/transformers/src/models/bert/tokenization_bert.js';
import { MODEL_CLASS_TO_NAME_MAPPING, MODEL_TYPE_MAPPING, MODEL_TYPES } from '../node_modules/@huggingface/transformers/src/models/modeling_utils.js';
import { mean_pooling } from '../node_modules/@huggingface/transformers/src/utils/tensor.js';
import { getModelJSON } from '../node_modules/@huggingface/transformers/src/utils/hub.js';
import { env } from '../node_modules/@huggingface/transformers/src/env.js';

// Explicit registration supplies the base runtime's encoder/session lookup;
// importing the all-model registry is unnecessary for this fixed model.
MODEL_CLASS_TO_NAME_MAPPING.set(BertModel, 'BertModel');
MODEL_TYPE_MAPPING.set('BertModel', MODEL_TYPES.EncoderOnly);
MODEL_TYPE_MAPPING.set('bert', MODEL_TYPES.EncoderOnly);
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
let model; let tokenizer; let documents; let vectors; let busy = false;
async function embed(texts) {
  // Match FeatureExtractionPipeline's padding, truncation, attention-mask mean
  // pooling and L2 normalization exactly; no classifier or generative head.
  const inputs = tokenizer(texts, { padding: true, truncation: true });
  const output = await model(inputs);
  if (!output.last_hidden_state) throw new Error('The pinned encoder did not return token embeddings.');
  return mean_pooling(output.last_hidden_state, inputs.attention_mask).normalize(2, -1);
}
onmessage = async ({ data }) => {
  if (busy) return;
  busy = true;
  try {
    if (data.type === 'load') {
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.wasmPaths = { mjs: data.assets.mjs, wasm: data.assets.wasm };
      const options = { revision: REVISION, dtype: 'q8', device: 'wasm', progress_callback: progress => postMessage({ type:'progress',progress }) };
      // Load the two known tokenizer files at the same immutable revision as
      // the weights. Generic tokenizer discovery also probes the main branch.
      const [loadedModel, tokenizerJSON, tokenizerConfig] = await Promise.all([
        BertModel.from_pretrained(MODEL, options),
        getModelJSON(MODEL, 'tokenizer.json', true, options),
        getModelJSON(MODEL, 'tokenizer_config.json', true, options),
      ]);
      model = loadedModel;
      if (model.config.model_type !== 'bert') throw new Error('The pinned semantic model is not a BERT encoder.');
      tokenizer = new BertTokenizer(tokenizerJSON, tokenizerConfig);
      documents = data.documents;
      const output = await embed(documents.map(x=>x.text));
      vectors = output.tolist();
      postMessage({ type:'ready', model:MODEL, revision:REVISION, dimensions:vectors[0].length, count:documents.length });
    } else if (data.type === 'search' && model && tokenizer && vectors) {
      const output = await embed(data.query);
      const queryVector = output.tolist()[0];
      const results = vectors.map((v,i)=>({ id:documents[i].id,score:v.reduce((s,n,j)=>s+n*queryVector[j],0) })).sort((a,b)=>b.score-a.score).slice(0,5);
      postMessage({ type:'results',results, requestId:data.requestId });
    }
  } catch (error) { postMessage({ type:'error', message:String(error.message || error) }); }
  finally { busy = false; }
};
