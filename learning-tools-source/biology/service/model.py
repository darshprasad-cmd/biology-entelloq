"""A fixed, educational enzyme mechanism. No user-supplied model execution."""
import math
import threading
import tellurium as te
import libsbml

LOCK = threading.Lock()
BOUNDS = {"substrate": (0, 20, 10), "enzyme": (0, 2, 0.5), "kcat": (0, 2, 0.3), "duration": (1, 120, 30)}

def parameters(raw):
    if not isinstance(raw, dict) or set(raw) - set(BOUNDS):
        raise ValueError("Only substrate, enzyme, kcat and duration are accepted")
    result = {}
    for name, (low, high, default) in BOUNDS.items():
        value = raw.get(name, default)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f"{name} must be a finite number from {low} to {high}")
        result[name] = float(value)
    return result

def simulate(raw):
    p = parameters(raw)
    model = f'''model entelloq_enzyme()
      unit substance = 1e-6 mole;
      unit volume = litre;
      unit perSecond = 1 / second;
      unit bindingRate = litre / (1e-6 mole * second);
      compartment cell = 1;
      species S in cell, E in cell, ES in cell, P in cell;
      bind: S + E -> ES; kon*S*E*cell;
      unbind: ES -> S + E; koff*ES*cell;
      catalyse: ES -> E + P; kcat*ES*cell;
      S = {p['substrate']}; E = {p['enzyme']}; ES = 0; P = 0;
      kon = 2; koff = 1; kcat = {p['kcat']};
      kon has bindingRate; koff has perSecond; kcat has perSecond;
    end'''
    with LOCK:
        rr = te.loada(model)
        rr.integrator.absolute_tolerance = 1e-11
        rr.integrator.relative_tolerance = 1e-9
        result = rr.simulate(0, p['duration'], 201, selections=['time', '[S]', '[E]', '[ES]', '[P]'])
        document = libsbml.readSBMLFromString(rr.getSBML())
        document.getModel().setTimeUnits('second')
        sbml = libsbml.writeSBMLToString(document)
    rows = result.tolist()
    substrate_error = max(abs(r[1] + r[3] + r[4] - p['substrate']) for r in rows)
    enzyme_error = max(abs(r[2] + r[3] - p['enzyme']) for r in rows)
    minimum = min(min(r[1:]) for r in rows)
    if substrate_error > 1e-7 or enzyme_error > 1e-7 or minimum < -1e-8:
        raise RuntimeError('Numerical conservation check failed; results withheld')
    return {
        'engine': 'Tellurium / libRoadRunner CVODE', 'version': te.__version__,
        'model': 'Closed single-compartment mass-action enzyme mechanism',
        'parameters': p, 'columns': ['time_s', 'substrate_uM', 'enzyme_uM', 'complex_uM', 'product_uM'],
        'rows': rows, 'units': {'time':'s', 'concentration':'µM', 'kon':'µM⁻¹ s⁻¹', 'koff':'s⁻¹', 'kcat':'s⁻¹'},
        'fixedRates': {'kon':2, 'koff':1},
        'conservation': {'substrateMoietyMaxError_uM': substrate_error, 'enzymeMoietyMaxError_uM':enzyme_error, 'minimumConcentration_uM': minimum},
        'antimony': model, 'sbml': sbml,
        'assumptions': ['Well-mixed closed compartment of constant volume', 'Fixed temperature and rate constants', 'No diffusion, inhibition, synthesis or degradation', 'Generic educational mechanism; no organism-specific experimental calibration', 'Conserved moieties, not an elemental or atom-balanced chemical reaction']
    }
