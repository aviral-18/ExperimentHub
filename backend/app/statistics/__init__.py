"""Statistical inference engine.

Every function here is a thin, well-documented wrapper around SciPy/statsmodels
so the maths is auditable and interview-explainable. Convention throughout:
group 1 = **control**, group 2 = **treatment**, and the reported difference is
always ``treatment - control`` (positive = treatment is higher).
"""
