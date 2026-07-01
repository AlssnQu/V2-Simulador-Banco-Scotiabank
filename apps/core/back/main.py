import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    rtr_scoring, rtr_creditos, rtr_ahorros,
    rtr_dashboard, rtr_clientes, rtr_auth, rtr_homebanking, rtr_recuperaciones,
)

app = FastAPI(
    title="Core Financiero — Scotiabank",
    description="Motor de scoring, cartera crediticia y KPIs institucionales",
    version="1.0.0"
)

cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    # Si hay comas, lo convierte en una lista real de Python
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    origins = ["http://localhost:5173"]

# BLOQUE CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # <-- Usa la lista dinámica perfectamente
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rtr_auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(rtr_scoring.router,   prefix="/scoring",   tags=["Scoring"])
app.include_router(rtr_creditos.router,  prefix="/creditos",  tags=["Créditos"])
app.include_router(rtr_ahorros.router,   prefix="/ahorros",   tags=["Ahorros"])
app.include_router(rtr_clientes.router,  prefix="/clientes",  tags=["Clientes"])
app.include_router(rtr_dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(rtr_homebanking.router, prefix="/hb",       tags=["Homebanking"])
app.include_router(rtr_recuperaciones.router, prefix="/recuperaciones", tags=["Recuperaciones"])

@app.get("/")
def root():
    return {"sistema": "Core Financiero Scotiabank", "version": "1.0.0", "status": "ok"}