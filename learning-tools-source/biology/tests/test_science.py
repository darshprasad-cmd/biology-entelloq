import json, math, sys, unittest
from pathlib import Path
import numpy as np
from scipy.integrate import solve_ivp
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'service'))
from model import simulate, te, parameters

class Science(unittest.TestCase):
    def test_reference_and_conservation(self):
        result = simulate({})
        rows = np.array(result['rows'])
        def derivative(t, y):
            s,e,es,p=y
            forward=2*s*e; reverse=es; catalysis=.3*es
            return [-forward+reverse,-forward+reverse+catalysis,forward-reverse-catalysis,catalysis]
        independent=solve_ivp(derivative,(0,30),[10,.5,0,0],t_eval=rows[:,0],method='DOP853',rtol=1e-11,atol=1e-12)
        error=float(np.max(np.abs(rows[:,1:]-independent.y.T)))
        self.assertLess(error,1e-6)
        self.assertLess(result['conservation']['substrateMoietyMaxError_uM'],1e-7)
        self.assertLess(result['conservation']['enzymeMoietyMaxError_uM'],1e-7)
        self.assertIn('<sbml',result['sbml'])
        import libsbml
        document=libsbml.readSBMLFromString(result['sbml'])
        self.assertEqual(document.getModel().getTimeUnits(),'second')
        self.assertEqual(document.getModel().getSubstanceUnits(),'substance')
        self.assertEqual(document.getModel().getVolumeUnits(),'litre')
        evidence={k:v for k,v in result.items() if k not in ('rows','sbml','antimony')}
        evidence['finalRow']=result['rows'][-1]
        evidence['independentDOP853MaxError_uM']=error
        (ROOT/'qa/science.json').write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

    def test_null_conditions(self):
        for p in ({'enzyme':0},{'substrate':0},{'kcat':0}):
            result=simulate(p)
            self.assertLess(max(abs(r[4]) for r in result['rows']),1e-10)

    def test_response_and_bounds(self):
        base=simulate({})['rows'][-1][4]
        self.assertGreater(simulate({'enzyme':1})['rows'][-1][4],base)
        self.assertGreater(simulate({'kcat':.6})['rows'][-1][4],base)
        for invalid in ({'enzyme':-1},{'enzyme':float('nan')},{'duration':121},{'model':'execute anything'},{'kcat':True},[],None):
            with self.assertRaises(ValueError):parameters(invalid)
        for p in ({'substrate':20,'enzyme':2,'kcat':2,'duration':120},{'substrate':0,'enzyme':0,'kcat':0,'duration':1}):
            self.assertLess(simulate(p)['conservation']['substrateMoietyMaxError_uM'],1e-7)

    def test_real_engine_analytic_reference(self):
        rr=te.loada('S -> P; k*S; S=10; P=0; k=.2;')
        rows=rr.simulate(0,10,101,selections=['time','S','P'])
        self.assertLess(max(abs(float(r[1])-10*math.exp(-.2*float(r[0]))) for r in rows),1e-4)

    def test_volume_bytes(self):
        import base64,hashlib
        sample=json.loads((ROOT/'assets/cells3d.json').read_text())
        self.assertEqual(sample['dimensionsXYZ'],[64,64,60])
        self.assertEqual(sample['spacingXYZ_um'],[1.04,1.04,.29])
        for c in sample['channels']:
            data=base64.b64decode(c['base64'])
            self.assertEqual(len(data),64*64*60)
            self.assertEqual(hashlib.sha256(data).hexdigest(),c['sha256'])
            self.assertGreater(len(set(data)),200)

if __name__ == '__main__':unittest.main(verbosity=2)
