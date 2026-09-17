import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { buildReportHTML, generarPorcionesTexto, esPorciones } from '../report/reporteHTML';
import { matchFotoKey, buscarFotos, fotoUrl, fotosDataMap, setBancoCustom, keysDeNombre, slugPlatillo } from '../utils/matchFoto';
import HistoriaClinica from './HistoriaClinica';
import { gridKeyDown } from '../utils/gridNav';

/* ============================================================
   NFITNESS 360 — Menús por tiempo de comida
   Capa 1: distribución automática (editable) + 3 opciones por
   tiempo + recuadro de imagen. La generación con IA (Capa 2)
   queda lista para enchufar en `generarIA`.
   ============================================================ */

// Paleta por variables de marca (configurable por instancia). Valores por
// defecto = Nfitness 360 (Natalia idéntica); Aretia los recolorea en config/branding.
const T = {
  bg: 'var(--cream)', surface: 'var(--card)', ink: 'var(--ink)', inkSoft: 'var(--stone)',
  line: 'var(--line)', lineSoft: 'var(--line-soft)', pine: 'var(--pine)', amber: 'var(--gold)',
  mint: 'var(--mint)', danger: 'var(--danger)', sage: 'var(--sage)',
};
const mono = "'Montserrat', system-ui, sans-serif";

const GRUPOS = [
  ['Cereales y tubérculos', 70, 2, 0, 15], ['Cereales con grasa', 115, 2, 5, 15],
  ['Leguminosas', 120, 8, 1, 20], ['Verdura', 25, 2, 0, 4], ['Fruta', 60, 0, 0, 15],
  ['Prod. animales · muy bajo en grasa', 40, 7, 1, 0], ['Prod. animales · bajo en grasa', 55, 7, 3, 0],
  ['Prod. animales · moderado en grasa', 75, 7, 5, 0], ['Prod. animales · alto en grasa', 100, 7, 8, 0],
  ['Leche descremada', 95, 9, 2, 12], ['Leche semidescremada', 110, 9, 4, 12], ['Leche entera', 150, 9, 8, 12],
  ['Leche con azúcar', 200, 8, 5, 30], ['Grasas', 45, 0, 5, 0], ['Grasas con proteína', 70, 3, 5, 3],
  ['Azúcares', 40, 0, 0, 10], ['Azúcares con grasa', 85, 0, 5, 10], ['Alimentos libres', 0, 0, 0, 0],
];
const GSHORT = ['Cereales', 'Cereales c/grasa', 'Leguminosas', 'Verdura', 'Fruta', 'P. animal MB', 'P. animal B', 'P. animal M', 'P. animal A', 'Leche desc.', 'Leche semi', 'Leche entera', 'Leche c/az.', 'Grasas', 'Grasas c/prot', 'Azúcares', 'Az. c/grasa', 'Libres'];

/* pesos por grupo hacia [Desayuno, Col AM, Comida, Col PM, Cena] */
const GW = [
  [.30, .10, .30, .05, .25], [.30, .10, .30, .05, .25], [0, 0, .6, 0, .4], [0, 0, .5, 0, .5],
  [.30, .35, 0, .35, 0], [.2, 0, .4, 0, .4], [.2, 0, .4, 0, .4], [.2, 0, .4, 0, .4], [.2, 0, .4, 0, .4],
  [.5, .25, 0, .25, 0], [.5, .25, 0, .25, 0], [.5, .25, 0, .25, 0], [.5, .25, 0, .25, 0],
  [.3, 0, .35, 0, .35], [.3, 0, .35, 0, .35], [.5, .5, 0, 0, 0], [.5, .5, 0, 0, 0], [.2, .2, .2, .2, .2],
];
const DEFAULT_TIEMPOS = [
  { nombre: 'Desayuno', hora: '07:00' }, { nombre: 'Colación AM', hora: '10:30' },
  { nombre: 'Comida', hora: '14:30' }, { nombre: 'Colación PM', hora: '18:00' }, { nombre: 'Cena', hora: '21:00' },
];

const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const r0 = (n) => Math.round(n);
const round2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const fmt = (n) => String(round2(n)); // muestra decimales tal cual (2.5, 2, 0.6) sin redondear a entero

/* ── Ajuste determinista de gramajes (sin IA) ──────────────────────────────────
   Con el recetario estructurado (COMPONENTES: por platillo, cuánto es 1 equivalente
   de cada grupo) y los equivalentes que el plan asignó al tiempo, se calculan los
   gramajes por multiplicación exacta. Formato: lista de componentes ajustados +
   "Preparación:" con el método original. Si el platillo no está estructurado o el
   tiempo no tiene equivalentes, devuelve la receta original sin tocar. */
/* eslint-disable */
const COMPONENTES = {"( tostaditas de requeson":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"}},"(2c,3p,1g) sincronizada arabe":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"(3p,2c,1g) omelette de verduras":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"(3p,2c,1g) sincronizada arabe":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó queso oaxaca ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"*recuerda que puedes cenar la sopa de fideos chinos pero":{"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"}},"aguacate":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó pollo","por_equivalente":"2 cdas (~40g)"}},"alambre de cecina o bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"cecina ó bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"alambre de pavo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"alambre de pollo":{"cereal":{"base":"tortilla de maíz ó tostadas horneadas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"alambre de pollo o bistec":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"alambre de pollo o pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pollo ó pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"alambre de pollo y queso":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"alambre de verduras":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"am//pm":{"libres":"salsa"},"am/pm":{"libres":"salsa","proteina":{"base":"pescado","por_equivalente":"30g cocido"}},"ana arcelus cano":{"grasa":{"base":"nueces ó almendras","por_equivalente":"6 piezas"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"arroz blanco":{"cereal":{"base":"arroz blanco","por_equivalente":"45 g cocido"}},"atun a la mexicana":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"atún","por_equivalente":"30g"}},"atun con arroz":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"atun con mayonesa y chipotle":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"libres":"chile","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"atun con pasta":{"grasa":{"base":"aguacate ó aceite de oliva/aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"atun con salmas":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"atun con verdura":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"avena":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano ó papaya","por_equivalente":"½ pieza"},"libres":"canela, vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"avena con fresa":{"cereal":{"base":"avena en hojuelas","por_equivalente":"20 g en hojuela (seca)"},"fruta":{"base":"fresa","por_equivalente":"200 g"}},"avena con fruta":{"cereal":{"base":"avena en hojuelas","por_equivalente":"20 g en hojuela (seca)"},"fruta":{"base":"a elegir","por_equivalente":"Según fruta (tabla): manzana 100 g · plátano 54 g · fresa 200 g · etc."}},"avena remojada":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"avo rice cakes":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"jocoque ó huevo","por_equivalente":"3 cdas"}},"avo toast":{"cereal":{"base":"pan integral (bimbo/oroweat) ó rice cakes","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"avo toast claras y espinacas":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"avo toast de claras":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"avo toast de pavo y huevo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"avo toast de salmon":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"avo toast de salmon ahumado":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso feta ó salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"avo toast de salmon con huevo":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"verdura":{"base":"jitomate/arúgula (opcional)","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"avo toast de salmon con queso crema":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"}},"avocado toast":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"avocado toast de claras":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"}},"avocado toast de salmon":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"ayuno":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"cafe"},"banana smoothie":{"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"bisquet half & half":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"bisquet half half":{"cereal":{"base":"bisquet","por_equivalente":"~27 g (ref. pan de caja)"}},"bistec":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó bistec","por_equivalente":"30g cocido"}},"blueberries hot cakes":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"canela","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"bolitas de avena":{"cereal":{"base":"avena en hojuelas","por_equivalente":"20 g en hojuela (seca)"},"grasa":{"base":"crema de cacahuate","por_equivalente":"~20 g (ref. cacahuates)"}},"bowl":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"fresas","por_equivalente":"~1 taza"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"}},"bowl completo":{"cereal":{"base":"arroz ó quinoa","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"}},"bowl completo (pollo, arroz, garbanzo)":{"cereal":{"base":"arroz","por_equivalente":"45 g cocido"},"leguminosa":{"base":"garbanzo","por_equivalente":"80 g"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"bowl cottage":{"cereal":{"base":"granola","por_equivalente":"~20g"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"limon","proteina":{"base":"queso cottage","por_equivalente":"2 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de acai / smoothie bowl":{"fruta":{"base":"açaí + plátano","por_equivalente":"plátano 54 g/eq; açaí ~100 g pulpa"},"cereal":{"base":"granola (topping)","por_equivalente":"~15 g (ref. cereal sin azúcar)"}},"bowl de arroz":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de arroz con salmon":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"bowl de arroz con salmon o atun o pollo":{"cereal":{"base":"arroz ó quinoa","por_equivalente":"~50g cocido"},"proteina":{"base":"pollo ó atún ó salmón","por_equivalente":"30g cocido"}},"bowl de arroz integral con pollo":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"fruta":{"base":"mango","por_equivalente":"½ pieza"},"libres":"limon","proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"bowl de arroz y salmon/pollo":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"}},"bowl de atun con pasta":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate ó aceitunas","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de atun o salmon":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún ó salmón ó proteína en polvo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de atun y pasta":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de atun/pollo":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"bowl de atun/pollo/salmon":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó proteína en polvo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de avena cocida y cottage":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"fresas","por_equivalente":"~1 taza"},"libres":"vainilla","proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de camaron":{"cereal":{"base":"arroz","por_equivalente":"45 g cocido"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"bowl de camaron con quinoa":{"cereal":{"base":"quinoa","por_equivalente":"20 g (≈ 50 g cocida)"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"bowl de carne con camote y requeson":{"cereal":{"base":"camote","por_equivalente":"~70g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó pollo ó carne","por_equivalente":"2 cdas (~40g)"}},"bowl de cottage":{"cereal":{"base":"granola ó avena","por_equivalente":"~20g"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de cottage con fruta":{"cereal":{"base":"granola","por_equivalente":"~20g"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de cottage proteico sencillo":{"cereal":{"base":"granola","por_equivalente":"~20g"},"fruta":{"base":"berries","por_equivalente":"~1 taza"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de cottage y fruta":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"papaya ó melón","por_equivalente":"~1 taza"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de cottage/yogurt":{"cereal":{"base":"granola","por_equivalente":"~20g"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de fruta (frutos rojos)":{"fruta":{"base":"frutos rojos","por_equivalente":"~100 g (ref. blueberries)"},"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"}},"bowl de fruta y cottage":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"nueces ó almendras","por_equivalente":"6 piezas"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de pasta con atun":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"bowl de pasta fria con pollo":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de pasta/salmon":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de pollo":{"cereal":{"base":"arroz ó pasta","por_equivalente":"~50g cocido"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de pollo con quinoa":{"cereal":{"base":"quinoa","por_equivalente":"20 g (≈ 50 g cocida)"},"verdura":{"base":"verduras a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"bowl de pollo o res":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó carne","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de pollo o salmon":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de pollo/quinoa":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de proteina":{"cereal":{"base":"arroz ó quinoa ó camote","por_equivalente":"~50g cocido"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de quinoa":{"cereal":{"base":"arroz ó quinoa","por_equivalente":"~50g cocido"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"bowl de quinoa con garbanzo":{"cereal":{"base":"quinoa","por_equivalente":"20 g (≈ 50 g cocida)"},"leguminosa":{"base":"garbanzo","por_equivalente":"80 g"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"bowl de quinoa con pollo y pimientos":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de quinoa/salmon":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de res con brocoli":{"cereal":{"base":"arroz","por_equivalente":"45 g cocido"},"verdura":{"base":"brócoli","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"bowl de salmon":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de salmon ahumado":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de salmon cocido":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"libres":"salsa","proteina":{"base":"salmón","por_equivalente":"30g"}},"bowl de salmon con arroz y verduras al grill":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"bowl de salmon o pollo":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"}},"bowl de salmon y calabacitas":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"bowl de yogurt":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"fresas ó berries","por_equivalente":"~1 taza"},"libres":"canela, vainilla"},"bowl de yogurt con fruta":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl de yogurt con granola y frutos rojos":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"frutos rojos","por_equivalente":"~100 g (ref. blueberries)"},"cereal":{"base":"granola","por_equivalente":"~15 g (ref. cereal sin azúcar)"}},"bowl de yogurt con kiwi y chia":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"kiwi","por_equivalente":"110 g"},"grasa":{"base":"nuez","por_equivalente":"10 g"}},"bowl de yogurt con mango":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"mango","por_equivalente":"110 g"}},"bowl de yogurt con platano y chia":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"plátano","por_equivalente":"54 g"}},"bowl proteico":{"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"canela","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"bowl proteico dulce":{"cereal":{"base":"granola","por_equivalente":"~20g"},"fruta":{"base":"fresas ó berries","por_equivalente":"~1 taza"},"proteina":{"base":"queso cottage","por_equivalente":"2 cdas"}},"bowl: pasta con proteina o arroz con proteina":{"cereal":{"base":"arroz ó pasta","por_equivalente":"~50g cocido"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"breakfast sandwich":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"brochetas de panela":{"proteina":{"base":"queso panela","por_equivalente":"30 g"},"verdura":{"base":"jitomate cherry","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"brochetas de pollo":{"verdura":{"base":"pimiento + cebolla","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"caldo de pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"carpaccio de calabaza y panela":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"limon","proteina":{"base":"queso panela","por_equivalente":"30g"}},"cecina con panela":{"verdura":{"base":"nopal asado","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"}},"cereal con leche":{"cereal":{"base":"cereal integral","por_equivalente":"15 g"},"lacteo":{"base":"descremada","por_equivalente":"240 ml"}},"cereal con proteina":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"cereal groovies":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"cereal proteico":{"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"ceviche de atun":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"ceviche de atun oriental":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ceviche de panela":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"fruta":{"base":"mango","por_equivalente":"½ pieza"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ceviche de pescado o atun":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pescado ó atún","por_equivalente":"30g cocido"}},"chalupa de nopal con pollo o bistec":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso oaxaca ó requesón ó pollo","por_equivalente":"30g"}},"chalupas de nopal con pollo y panela a la plancha":{"proteina":{"base":"queso panela ó pollo ó bistec","por_equivalente":"30g"}},"chalupas de requeson y pollo":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"requesón ó pollo","por_equivalente":"2 cdas (~40g)"}},"chalupitas de nopal":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"chalupitas de nopal cambray con pavo y pollo":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pollo ó pavo","por_equivalente":"30g cocido"}},"chalupitas de nopal con huevo estrellado":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"chalupitas de nopal con panela y pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"chalupitas de nopal con pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"chalupitas de nopal con pollo desmenuzado":{"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"chalupitas de nopal con requeson":{"proteina":{"base":"queso panela ó queso oaxaca ó requesón","por_equivalente":"30g"}},"chalupitas de pollo":{"cereal":{"base":"tortilla de maíz (chalupa)","por_equivalente":"30 g (1 pza)"},"verdura":{"base":"lechuga","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"chalupitas de pollo o bistec o pavo":{"libres":"vainilla","proteina":{"base":"requesón ó pollo ó pavo","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"chia pudin overnight":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"canela, vainilla"},"chilaquiles":{"cereal":{"base":"totopos horneados","por_equivalente":"~30g"},"libres":"salsa","proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"chilaquiles fit":{"cereal":{"base":"totopos horneados","por_equivalente":"~30g"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pollo ó huevo","por_equivalente":"30g"}},"chilaquiles healthy":{"cereal":{"base":"totopos horneados","por_equivalente":"~30g"},"libres":"salsa","proteina":{"base":"pollo ó cecina ó huevo","por_equivalente":"30g cocido"}},"chilaquiles heatlhy":{"cereal":{"base":"totopos horneados","por_equivalente":"~30g"},"libres":"salsa","proteina":{"base":"pollo ó huevo","por_equivalente":"30g cocido"}},"chilaquiles verdes":{"cereal":{"base":"totopos horneados","por_equivalente":"1 tortilla (30 g)"},"verdura":{"base":"salsa verde","por_equivalente":"Al gusto (salsa/caldo)"}},"chilquiles fit":{"cereal":{"base":"totopos horneados","por_equivalente":"~30g"},"libres":"salsa","proteina":{"base":"queso panela ó pollo ó huevo","por_equivalente":"30g"}},"chuleta a la parrilla":{"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"arroz (opcional)","por_equivalente":"45 g cocido"}},"claras":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"fruta":{"base":"fresas ó kiwi ó piña","por_equivalente":"~1 taza"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"claras a la mexicana":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"}},"claras con aguacate":{"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"claras con espinacas":{"cereal":{"base":"salmas ó avena","por_equivalente":"1 paquete"},"libres":"canela, vainilla","proteina":{"base":"queso panela ó clara de huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"claras con feta y verduras":{"cereal":{"base":"pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 rebanada"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"claras con panela":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó clara de huevo","por_equivalente":"30g"}},"claras en costra con queso":{"proteina":{"base":"queso panela ó queso oaxaca ó clara de huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"claras y huevo con salmon":{"cereal":{"base":"pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón ó clara de huevo ó huevo","por_equivalente":"30g"}},"claras y pavo":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"pavo ó clara de huevo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"coditos con atun y verduras":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"proteina":{"base":"atún","por_equivalente":"30g"}},"con pimientos de colores":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"costra de claras":{"proteina":{"base":"queso panela ó clara de huevo","por_equivalente":"30g"}},"costra de huevo con verduras":{"proteina":{"base":"queso oaxaca ó clara de huevo ó huevo","por_equivalente":"30g"}},"cottage toast":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso cottage ó pavo","por_equivalente":"2 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"crema de champinones":{"verdura":{"base":"champiñones","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"crepa":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"crepa hulk":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"crepa salada":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"crepa salada de huevo":{"cereal":{"base":"crepa (harina)","por_equivalente":"~20 g de harina (ref. tortilla de harina)"},"verdura":{"base":"espinaca","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"de la competencia*":{"libres":"salsa","proteina":{"base":"carne ó proteína en polvo","por_equivalente":"30g cocida"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"dentro":{"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"durante el vuelo":{"proteina":{"base":"pollo ó pescado ó huevo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"edamames":{"leguminosa":{"base":"edamame","por_equivalente":"~85 g (ref. frijol)"}},"enchiladas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"enchiladas de huevo o pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"queso panela ó pollo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"enchiladas de pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"enchiladas divorciadas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"},"verdura":{"base":"salsa verde y roja","por_equivalente":"Al gusto (salsa/caldo)"}},"enchiladas verde":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"enchiladas verdes":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"queso oaxaca ó pollo","por_equivalente":"30g"}},"enchiladas verdes de pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"enchiladas verdes o rojas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"queso panela ó queso feta ó pollo","por_equivalente":"30g"}},"enfrijoladas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"cafe","proteina":{"base":"queso panela","por_equivalente":"30g"}},"ensalada":{"cereal":{"base":"pasta ó quinoa","por_equivalente":"~50g cocida"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"ensalada completa":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada con pasta y pollo o salmon cocido o crudo":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada con pasta y proteina":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"proteina":{"base":"pollo ó atún ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada con pollo":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"libres":"limon","proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada con pollo y cabra":{"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de atun":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó atún","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de atun con palmitos, zanahoria y pepino":{"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de atun sellado":{"verdura":{"base":"mix verde (lechuga, jitomate, pepino)","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"ensalada de huevo cocido":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de huevos cocidos y atun":{"proteina":{"base":"queso panela ó atún ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de pollo":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de pollo con verduras":{"verdura":{"base":"lechuga, jitomate, pepino, zanahoria","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"ensalada de pollo desmenuzado":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de pollo y panela":{"libres":"limon","proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de pollo y quinoa":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"libres":"limon","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de quinoa":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó atún ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de quinoa + pollo":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada de quinoa/salmon":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada fria de pollo":{"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"libres":"especias","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada griega + salmon":{"grasa":{"base":"aceite de oliva/aguacate ó aceitunas","por_equivalente":"1 cdita"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"ensalada tricolor estilo griego":{"verdura":{"base":"jitomate + pepino + cebolla morada","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"ensalada tricolor, estilo griego":{"cereal":{"base":"quinoa","por_equivalente":"~50g cocida"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"entomatadas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"melón","por_equivalente":"~1 taza"},"libres":"salsa","proteina":{"base":"queso panela ó requesón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"entrenos":{"fruta":{"base":"fresas ó plátano ó manzana","por_equivalente":"~1 taza"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"ericka rodriguez":{"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"chile, chamoy","verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"esteban cruz alvarado":{"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"extras":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"}},"filete de pescado con pure de camote":{"cereal":{"base":"camote","por_equivalente":"~70g cocido"},"libres":"limon","proteina":{"base":"pescado","por_equivalente":"30g cocido"}},"frijoles":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"frijoles charros":{"leguminosa":{"base":"frijol","por_equivalente":"85 g"},"cereal":{"base":"tortilla de maíz (opcional)","por_equivalente":"30 g (1 pza)"}},"frijoles refritos":{"leguminosa":{"base":"frijol","por_equivalente":"85 g"}},"fruta arandano":{"fruta":{"base":"arándano","por_equivalente":"100 g"}},"fruta ciruela":{"fruta":{"base":"ciruela","por_equivalente":"~2 pzas (~90 g)"}},"fruta coco":{"fruta":{"base":"coco","por_equivalente":"Coco = grasa (no fruta)"}},"fruta durazno":{"fruta":{"base":"durazno","por_equivalente":"130 g"}},"fruta fresa":{"fruta":{"base":"fresa","por_equivalente":"200 g"}},"fruta frutos rojos":{"fruta":{"base":"frutos rojos","por_equivalente":"~100 g (ref. blueberries)"}},"fruta guayaba":{"fruta":{"base":"guayaba","por_equivalente":"125 g"}},"fruta kiwi":{"fruta":{"base":"kiwi","por_equivalente":"110 g"}},"fruta mandarina":{"fruta":{"base":"mandarina","por_equivalente":"128 g"}},"fruta manzana":{"fruta":{"base":"manzana","por_equivalente":"100 g"}},"fruta melon":{"fruta":{"base":"melón","por_equivalente":"160 g picado"}},"fruta papaya":{"fruta":{"base":"papaya","por_equivalente":"140 g picada"}},"fruta pera":{"fruta":{"base":"pera","por_equivalente":"80 g"}},"fruta pina":{"fruta":{"base":"piña","por_equivalente":"124 g picada"}},"fruta platano":{"fruta":{"base":"plátano","por_equivalente":"54 g"}},"fruta sandia":{"fruta":{"base":"sandía","por_equivalente":"160 g picada"}},"fruta toronja":{"fruta":{"base":"toronja","por_equivalente":"~½ pza (~180 g)"}},"fruta tuna":{"fruta":{"base":"tuna","por_equivalente":"~2 pzas (~140 g)"}},"fruta uva":{"fruta":{"base":"uva","por_equivalente":"90 g"}},"gorditas de huevo":{"cereal":{"base":"masa de maíz (gordita)","por_equivalente":"~30 g de masa (como tortilla de maíz)"}},"granola con arandano":{"cereal":{"base":"granola","por_equivalente":"~15 g (ref. cereal sin azúcar)"},"fruta":{"base":"arándano","por_equivalente":"100 g"},"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"}},"green smoothie":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"piña","por_equivalente":"~1 taza"},"grasa":{"base":"nueces","por_equivalente":"6 piezas"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"gringa de bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso oaxaca ó bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"guisado de res":{"verdura":{"base":"papa, zanahoria, chícharo","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"arroz ó tortilla","por_equivalente":"Arroz 45 g cocido ó 1 tortilla de maíz (30 g)"}},"hamburguesa":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hamburguesa de pollo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hidratacion":{"libres":"cafe"},"hot cake de avena":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"canela, vainilla","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"hot cakes":{"grasa":{"base":"nueces","por_equivalente":"6 piezas"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"clara de huevo ó proteína en polvo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hot cakes con fruta":{"cereal":{"base":"harina de avena","por_equivalente":"20 g"},"fruta":{"base":"a elegir","por_equivalente":"Según fruta (tabla): manzana 100 g · plátano 54 g · fresa 200 g · etc."}},"hot cakes con huevo y fresa":{"cereal":{"base":"harina de avena","por_equivalente":"20 g"},"fruta":{"base":"fresa","por_equivalente":"200 g"}},"hot cakes de avena":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"}},"hot cakes de cacao":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"hot cakes de cacao y platano":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"proteina":{"base":"queso cottage ó clara de huevo ó huevo","por_equivalente":"2 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hot cakes de platano y cacao":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"hot cakes de proteina hulk":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hot cakes hulk":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"canela","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hot cakes proteico / tortitas de platano":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"libres":"canela, vainilla","proteina":{"base":"huevo ó proteína en polvo","por_equivalente":"1 pieza"}},"hot cakes proteicos":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"proteina":{"base":"queso cottage ó huevo ó proteína en polvo","por_equivalente":"2 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hot cakes proteicos de platano":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"canela, vainilla","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"hot cakes proteicos de zanahoria":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"vainilla","proteina":{"base":"clara de huevo ó huevo ó proteína en polvo","por_equivalente":"60ml"}},"hot cakes sabor pastel de zanahoria":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"canela","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hot cakes zanahoria":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"canela, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"hotcakes":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"canela, vainilla","verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"hotcakes con proteina":{"grasa":{"base":"crema de maní/spread ó almendras","por_equivalente":"1 cdita"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"}},"hotcakes de blueberies":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"canela, vainilla","proteina":{"base":"queso cottage ó huevo","por_equivalente":"2 cdas"}},"hotcakes de blueberries":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"canela, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"hotcakes de chocolate":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"vainilla","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"hotcakes de platano":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"proteina":{"base":"queso cottage ó clara de huevo","por_equivalente":"2 cdas"}},"hotcakes de zanahoria":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"canela, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huarache de nopal":{"proteina":{"base":"queso panela ó bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huarache de nopal con panela":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"queso panela ó pollo ó bistec","por_equivalente":"30g"}},"huarache de nopal con pollo":{"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huarache de nopal con proteina":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pollo ó cecina","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huarache de pollo y nopal":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"huevo + salmas":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo a la mexicana":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"}},"huevo a la mexicana / con rajas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"},"verdura":{"base":"jitomate/cebolla/chile ó rajas","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"huevo al gusto con fruta":{"fruta":{"base":"a elegir","por_equivalente":"Según fruta (tabla): manzana 100 g · plátano 54 g · fresa 200 g · etc."}},"huevo cocido":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevo cocido machacado con aguacate y requeson":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon, chile","proteina":{"base":"requesón ó huevo","por_equivalente":"2 cdas (~40g)"}},"huevo cocidos con requeson y aguacate":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó huevo","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo con costra de queso feta":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo con espinacas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"melón","por_equivalente":"~1 taza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo con feta y verduras":{"cereal":{"base":"tortilla de maíz ó pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"}},"huevo con jamon de pavo":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo con jamon y avo toast":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"}},"huevo con nopales":{"verdura":{"base":"nopal","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"}},"huevo con nopales y frijoles":{"verdura":{"base":"nopal","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"leguminosa":{"base":"frijol","por_equivalente":"85 g"},"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"}},"huevo con pechuga de pavo":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo estrellado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate ó nueces","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevo estrellado en sope":{"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo revuelto":{"cereal":{"base":"tortilla de maíz ó totopos horneados","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"pollo ó huevo","por_equivalente":"30g cocido"}},"huevo revuelto con jamon":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo revuelto con pechuga de pavo y espinacas":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo revuelto con toffu":{"cereal":{"base":"tortilla de maíz ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo revueltos":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo y claras":{"cereal":{"base":"tortilla de maíz ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo y claras con verduras":{"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevo y esparragos":{"cereal":{"base":"salmas ó camote","por_equivalente":"1 paquete"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevos + feta":{"cereal":{"base":"camote","por_equivalente":"~70g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos a la mexicana":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"}},"huevos ahogados":{"libres":"salsa","proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos al gusto":{"cereal":{"base":"tortilla de maíz ó pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 pieza"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevos arabes":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat) ó totopos horneados","por_equivalente":"1 pieza chica"},"proteina":{"base":"jocoque ó huevo","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos cocidos":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevos con brocoli":{"verdura":{"base":"brócoli","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"tortilla ó pan","por_equivalente":"1 tortilla de maíz (30 g) ó pan de caja 27 g"}},"huevos con costra de queso":{"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con ejote":{"verdura":{"base":"ejote","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"}},"huevos con espinaca":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con espinacas y feta":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con espincas y feta":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con jamon":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"}},"huevos con jamon de pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"fruta":{"base":"piña","por_equivalente":"~1 taza"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con jamon y verdura":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con jamon y verduras":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"pavo ó clara de huevo ó huevo","por_equivalente":"30g / 2 rebanadas"}},"huevos con nopales y feta":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con pan tomate":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"fruta":{"base":"piña ó papaya ó melón","por_equivalente":"~1 taza"},"libres":"salsa","proteina":{"base":"queso mozzarella ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con pimientos y pechuga de pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos con queso feta y espinacas":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos divorciados":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"}},"huevos duros":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos en costra de feta":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos en costra de queso feta":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos en costra queso feta":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos en salsa roja":{"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"},"verdura":{"base":"salsa roja","por_equivalente":"Al gusto (salsa/caldo)"}},"huevos estrellados":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos estrellados con pan pita":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"jocoque ó huevo","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos estrellados con queso fundido":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"}},"huevos estrellados en avo toast":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevos estrellados en pan pita":{"cereal":{"base":"pan árabe integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"jocoque ó huevo","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos estrellados sobre tortilla":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"huevos estrellados sobre tortilla y pechuga de pavo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"}},"huevos fritos":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"salsa, spray","proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos machacados":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"limon","proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos rancheros":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"}},"huevos revueltos":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con calabacitas a la mexicana":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"chile","proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con espinaca y jitomate":{"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"},"verdura":{"base":"espinaca + jitomate","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"huevos revueltos con espinacas":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con espinacas y aguacate":{"cereal":{"base":"tortilla de maíz ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con flakes":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con jamon":{"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con nopales":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"fruta":{"base":"piña ó papaya ó melón","por_equivalente":"~1 taza"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"}},"huevos revueltos con papa":{"cereal":{"base":"papa","por_equivalente":"~70g cocida"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con pimientos y champinones":{"cereal":{"base":"tortilla de maíz ó pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 pieza"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con salmon":{"cereal":{"base":"pan pita integral ó salmas ó totopos horneados","por_equivalente":"1 pieza chica"},"proteina":{"base":"salmón ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos con salmon y queso feta":{"cereal":{"base":"pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó salmón ó huevo","por_equivalente":"30g"}},"huevos revueltos con verduras":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"fruta":{"base":"melón","por_equivalente":"~1 taza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos o al gusto":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"huevos revueltos verdura":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"index":{"libres":{"base":"— (No parece un platillo)","por_equivalente":"N/A"}},"inmediato":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"kiwi":{"fruta":{"base":"kiwi","por_equivalente":"110 g"}},"kiwi con chocolate":{"fruta":{"base":"kiwi","por_equivalente":"110 g"},"grasa":{"base":"chocolate amargo","por_equivalente":"No está en la tabla"}},"laura aceves":{"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"lomo de cerdo al curry con arroz con calabacitas":{"cereal":{"base":"arroz","por_equivalente":"45 g cocido"},"verdura":{"base":"calabacita","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"lomo de cerdo al curry con arroz con esparragos":{"cereal":{"base":"arroz","por_equivalente":"45 g cocido"},"verdura":{"base":"espárragos","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"mango":{"fruta":{"base":"mango","por_equivalente":"110 g"}},"manzana verde":{"fruta":{"base":"manzana verde","por_equivalente":"100 g"}},"marcos":{"fruta":{"base":"fresas ó manzana","por_equivalente":"~1 taza"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"mega gringa de pan pita":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"melon con almendra":{"fruta":{"base":"melón","por_equivalente":"160 g picado"},"grasa":{"base":"almendra","por_equivalente":"12 g (~10 pzas)"}},"milanesa de pollo":{"cereal":{"base":"pan molido (empanizado)","por_equivalente":"empanizado ligero (~27 g pan de caja)"},"verdura":{"base":"ensalada","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"mix de huevo cocido con requeson y aguacate":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó huevo","por_equivalente":"2 cdas (~40g)"}},"mollete":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"libres":"canela","proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"mollete fit":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"molletes":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"molletes fit":{"cereal":{"base":"tostadas horneadas ó arroz","por_equivalente":"2 piezas"}},"molletes healthy":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"molletes ligeros":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"montaditos de atun":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"montaditos de requeson":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"proteina":{"base":"queso oaxaca ó requesón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"montaditos de rice cakes":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"mug cake":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"libres":"canela, vainilla","proteina":{"base":"queso cottage ó huevo","por_equivalente":"2 cdas"}},"nopal asado":{"verdura":{"base":"nopal","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"proteina":{"base":"queso panela","por_equivalente":"30 g"}},"nopales cambray":{"fruta":{"base":"fresas ó kiwi","por_equivalente":"~1 taza"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"nopales con frijol":{"verdura":{"base":"nopal","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"leguminosa":{"base":"frijol","por_equivalente":"85 g"},"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"}},"nopales con pollo y panela":{"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette":{"proteina":{"base":"queso oaxaca ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette con frijol":{"leguminosa":{"base":"frijol","por_equivalente":"85 g"}},"omelette de champinones":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo ó huevo ó proteína en polvo","por_equivalente":"60ml"}},"omelette de claras":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette de claras, espinacas y cottage":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso cottage ó clara de huevo","por_equivalente":"2 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette de huevo":{"proteina":{"base":"queso panela ó pavo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette de pavo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó clara de huevo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette de salmon":{"proteina":{"base":"salmón ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette de salmon/pavo":{"proteina":{"base":"pavo ó salmón ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omelette de verduras":{"cereal":{"base":"tortilla de maíz ó tostadas horneadas","por_equivalente":"1 pieza"},"proteina":{"base":"queso feta ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omellete":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó clara de huevo ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"omellete con champinones":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"}},"omellete de claras con queso oaxaca":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso oaxaca ó clara de huevo","por_equivalente":"30g"}},"overnight":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"}},"overnight oats":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"crema de maní/spread ó almendras","por_equivalente":"1 cdita"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"overnight proteico":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"palomitas":{"cereal":{"base":"palomitas naturales","por_equivalente":"20 g"}},"pan / toast con mantequilla":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"grasa":{"base":"mantequilla","por_equivalente":"6 g"}},"pan arabe con huevo":{"cereal":{"base":"pan árabe integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"}},"pan con hummus":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pan frances":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"canela, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"pan frances healthy":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"canela, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"pan pita de salmon":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pan tostado con burrata y cherry":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pan tostado y huevo cocido":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso feta ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"panela":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"panela asado":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"panela asado con pico de gallo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"panela asado con salsa":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"papa horneada rellena":{"cereal":{"base":"papa","por_equivalente":"68 g cocida"}},"papas cambray":{"cereal":{"base":"papa cambray","por_equivalente":"68 g cocida"},"grasa":{"base":"aceite de oliva","por_equivalente":"5 g (1 cdita)"}},"pasta a la bolonesa":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"salsa","proteina":{"base":"carne","por_equivalente":"30g cocida"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pasta a la bolonesa con atun":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"libres":"salsa","proteina":{"base":"atún","por_equivalente":"30g"}},"pasta con atun":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pasta con carne":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"carne","por_equivalente":"30g cocida"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pasta con pollo":{"cereal":{"base":"pasta","por_equivalente":"50 g"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"pasta con pollo o salmon al limon":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pasta con salsa de tomate y atun":{"cereal":{"base":"pasta","por_equivalente":"~50g cocida"},"libres":"salsa","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pasta integral":{"cereal":{"base":"pasta integral","por_equivalente":"50 g"}},"patricio hernandez":{"grasa":{"base":"crema de maní/spread ó nueces ó almendras","por_equivalente":"1 cdita"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"pechuga de pavo asada":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pepino y zanahoria con tajin":{"verdura":{"base":"pepino + zanahoria","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"pera":{"fruta":{"base":"pera","por_equivalente":"80 g"}},"pescado a la plancha":{"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"arroz (opcional)","por_equivalente":"45 g cocido"}},"pescado empapelado con verduras":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"spray","verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pina colada":{"fruta":{"base":"piña","por_equivalente":"~1 taza"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"pink smoothie":{"fruta":{"base":"fresas","por_equivalente":"~1 taza"},"grasa":{"base":"almendras","por_equivalente":"10 piezas"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"libres":"vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pita con pavo y huevo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"}},"pita pizzas":{"cereal":{"base":"pan árabe integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"libres":"salsa","proteina":{"base":"queso oaxaca","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pizza casera":{"cereal":{"base":"tortilla de maíz ó pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza"},"libres":"salsa","verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pizza casera / fit":{"cereal":{"base":"base (tortilla integral ó masa)","por_equivalente":"1 pza: tortilla de harina 20 g ó de maíz 30 g"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"pizza fit":{"cereal":{"base":"pan árabe integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"libres":"salsa","proteina":{"base":"queso oaxaca ó pavo","por_equivalente":"30g"}},"pizza healthy":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso oaxaca ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"plato mediterraneo":{"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"poke bowl":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó atún ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pollo con papas cocidas":{"cereal":{"base":"papa","por_equivalente":"~70g cocida"},"libres":"limon","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"pre 3:00pm":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"pre am":{"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"pre y post":{"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"pre-post":{"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"canela"},"preentren/snack":{"fruta":{"base":"berries","por_equivalente":"~1 taza"},"grasa":{"base":"crema de maní/spread ó almendras","por_equivalente":"1 cdita"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"proteina / suplemento (batido)":{"lacteo":{"base":"agua ó leche descremada","por_equivalente":"Leche light 240 ml (el agua no suma eq)"}},"pure de camote":{"cereal":{"base":"camote","por_equivalente":"70 g cocido"}},"quesadilla":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"fresas","por_equivalente":"~1 taza"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"quesadilla con aguacate":{"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"},"grasa":{"base":"aguacate","por_equivalente":"55 g"}},"quesadillas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"quesadillas con espinacas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó queso oaxaca","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"quesadillas con huitlacoche o flor de calabaza":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"}},"quesadillas con panela y pavo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"quesadillas con pollo y verdura":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"quesadillas con queso y pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso oaxaca ó pollo","por_equivalente":"30g"}},"quesadillas con requeson, aguacate y champinones":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"quesadillas pavo/panela":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"recomendaciones":{"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"recomendaciones estilo de vida":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"}},"recomendaciones ri":{"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"recovery":{"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"requeson a la mexicana":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"res a la plancha":{"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"arroz ó tortilla","por_equivalente":"Arroz 45 g cocido ó 1 tortilla de maíz (30 g)"}},"revuelto o cocido":{"cereal":{"base":"pan thins","por_equivalente":"2 tapas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo ó huevo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake":{"cereal":{"base":"pan integral (bimbo/oroweat) ó rice cakes","por_equivalente":"1 rebanada"},"proteina":{"base":"jocoque ó pavo","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake con atun y aguacate":{"proteina":{"base":"requesón ó atún","por_equivalente":"2 cdas (~40g)"}},"rice cake con cabra y huevo revuelto":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"}},"rice cake con cottage o ricotta":{"proteina":{"base":"queso cottage ó pavo","por_equivalente":"2 cdas"}},"rice cake con frijoles":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake con hummus y pavo":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake con hummus y pollo o atun en cubos":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pollo ó atún","por_equivalente":"30g cocido"}},"rice cake con pavo y requeson":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"}},"rice cake con pepino":{"cereal":{"base":"rice cake","por_equivalente":"~20 g (2 pzas)"},"verdura":{"base":"pepino","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"rice cake con requeson y pavo":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"}},"rice cake con salmon ahumado":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake de atun sellado":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake de jocoque y salmon":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"proteina":{"base":"jocoque ó salmón","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cake dulces y saladas":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"rice cakes":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"proteina":{"base":"requesón ó salmón","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cakes con aguacate y pollo hervido":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"rice cakes con atun y aguacate":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cakes de pavo panela":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cakes de pollo o pavo":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"proteina":{"base":"pollo ó pavo ó proteína en polvo","por_equivalente":"30g cocido"}},"rice cakes montaditos":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"jocoque ó salmón","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rice cakes pavo":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate ó crema de maní/spread ó almendras","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"rice con requeson y huevo":{"cereal":{"base":"pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 rebanada"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rollitos de calabaza y ricotta":{"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rollitos de jamon":{"proteina":{"base":"jamón de pavo","por_equivalente":"40 g"},"verdura":{"base":"pepino/aguacate","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"rollitos de pavo":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"rollitos de pavo y panela":{"cereal":{"base":"rice cakes ó totopos horneados","por_equivalente":"2 piezas"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rollitos de pavo/panela":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"rollitos pavo + panela":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"salmas + pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"salmas con aguacate y requeson":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"salmas con pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"salmas con requeson":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"salmas con salmon ahumado":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"limon","proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"salmon ahumado":{"cereal":{"base":"pan integral (bimbo/oroweat) ó rice cakes","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"salmon con arroz":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"}},"salmon teriyaki":{"cereal":{"base":"arroz","por_equivalente":"45 g cocido"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"salmon toast":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"salmón ó huevo","por_equivalente":"30g"}},"salteado de pollo":{"verdura":{"base":"pimiento, brócoli, zanahoria","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"arroz","por_equivalente":"45 g cocido"}},"sandwich":{"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich con pan thins":{"cereal":{"base":"pan thins ó pan integral (bimbo/oroweat)","por_equivalente":"2 tapas"},"proteina":{"base":"queso panela ó salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de atun":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"atún","por_equivalente":"30g"}},"sandwich de atun a la mexicana":{"proteina":{"base":"queso mozzarella ó atún","por_equivalente":"30g"}},"sandwich de atun con aguacate":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de atun o pavo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso panela ó pavo ó atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de atun o pavo o pollo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso panela ó pollo ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de crema de cacahuate":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"grasa":{"base":"crema de cacahuate","por_equivalente":"~20 g (ref. cacahuates)"}},"sandwich de huevo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pavo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pavo o pollo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó queso oaxaca ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pavo panela":{"cereal":{"base":"pan thins","por_equivalente":"2 tapas"},"libres":"limon","proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pavo-panela":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pechuga de atun":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pechuga de pavo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de pollo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de salmon":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich de salmon ahumado":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso feta ó salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich pavo-panela":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sandwich tuna melt":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"atún","por_equivalente":"30g"}},"sandwich tuna melt 1":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"}},"sanwich de pollo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sashimi de salmon ahumado + ensalada":{"libres":"limon, chile","proteina":{"base":"atún ó salmón","por_equivalente":"30g"}},"sin crema":{"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sincronizada":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"sincronizada arabe":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sincronizada con verduras":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"sincronizada de bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sincronizada de pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sincronizadas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó queso oaxaca ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sincronizadas arabes":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"libres":"salsa","proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"smoothie express completo":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"cafe","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"smoothie practico":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"fresas ó berries","por_equivalente":"~1 taza"},"libres":"canela, vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"smoothie practico verde":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"grasa":{"base":"nueces ó almendras","por_equivalente":"6 piezas"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"smoothie proteico":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"berries","por_equivalente":"~1 taza"},"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"smoothie reese s":{"lacteo":{"base":"leche descremada","por_equivalente":"240 ml"},"fruta":{"base":"plátano","por_equivalente":"54 g"}},"smoothie reese´s":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"grasa":{"base":"crema de maní/spread","por_equivalente":"1 cdita"},"libres":"cafe, canela, vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"smoothie verde":{"libres":"canela, vainilla","proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopa azteca tortilla":{"cereal":{"base":"tortilla en tiras (horneadas)","por_equivalente":"30 g (1 tortilla)"},"verdura":{"base":"caldo de jitomate","por_equivalente":"Al gusto (salsa/caldo)"}},"sopa de pollo y panela":{"verdura":{"base":"zanahoria, calabaza, apio","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"sopa de verduras":{"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"sope":{"proteina":{"base":"queso panela ó pollo ó huevo","por_equivalente":"30g"}},"sope con frijol y bistec":{"proteina":{"base":"bistec","por_equivalente":"30g"}},"sope con pollo o huevo":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó queso feta ó pollo","por_equivalente":"30g"}},"sope de nopal":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"cecina ó bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sope de pollo":{"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"sope de pollo o huevo":{"proteina":{"base":"queso panela ó pollo ó huevo","por_equivalente":"30g"}},"sope de pollo y panela":{"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopecito de nopal":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopecitos de nopal y huevo":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopes":{"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"sopes con huevo":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopes de carne asada":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"carne","por_equivalente":"30g cocida"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopes de cecina con nopales":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"cecina","por_equivalente":"30g"}},"sopes de huevo":{"proteina":{"base":"requesón ó pavo ó huevo","por_equivalente":"2 cdas (~40g)"}},"sopes de nopal":{"fruta":{"base":"fresas","por_equivalente":"~1 taza"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"}},"sopes de nopal con pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pollo ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopes de nopal con pollo o bistec o pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pollo ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"sopes de pollo":{"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"sopes de pollo o huevo":{"proteina":{"base":"pollo ó huevo","por_equivalente":"30g cocido"}},"sopes de pollo y nopal":{"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"sopes o chalupas":{"cereal":{"base":"sope de maíz","por_equivalente":"~30 g de masa (como tortilla de maíz)"},"verdura":{"base":"lechuga","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"leguminosa":{"base":"frijol","por_equivalente":"85 g"}},"sumplementos":{"proteina":{"base":"proteína en polvo","por_equivalente":"½ scoop"}},"taco // tostadas de atun":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"}},"tacos bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de alambre de cecina o bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso oaxaca ó cecina ó bistec","por_equivalente":"30g"}},"tacos de alambre panela y nopales con cebolla y pimientos":{"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de atun":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"}},"tacos de atun al chipotle":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"bistec","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de bistec o pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso oaxaca ó pescado ó bistec","por_equivalente":"30g"}},"tacos de bistec o pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"aerosol","proteina":{"base":"pollo ó bistec","por_equivalente":"30g cocido"}},"tacos de bistec/cecina":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"salsa","proteina":{"base":"cecina ó bistec","por_equivalente":"30g"}},"tacos de carne":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó carne","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de carne o pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó carne","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de carne o pollo o pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó carne","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de carnitas de atun":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"atún","por_equivalente":"30g"}},"tacos de cecina":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"cecina","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de cecina con nopales":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"cecina","por_equivalente":"30g"}},"tacos de claras con espinacas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"clara de huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de fajitas de pollo o res":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó carne","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de panela":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de panela con aguacate":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"pescado","por_equivalente":"30g cocido"}},"tacos de pescado asado":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pescado con verduras":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pescado o atun sellado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pescado ó atún","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo asado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo con nopaes":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo con nopales":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"tacos de pollo en salsa":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"tacos de pollo o bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó bistec","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo o pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pollo ó pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo tipo alambre":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo y queso":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso oaxaca ó pollo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo/bistec":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"proteina":{"base":"pollo ó bistec","por_equivalente":"30g cocido"}},"tacos de pollo/carne":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó carne","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de pollo/pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"limon","proteina":{"base":"pollo ó pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de rajas":{"cereal":{"base":"tortilla de maíz","por_equivalente":"30 g (1 pza)"},"verdura":{"base":"rajas de poblano","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"tacos de requeson":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"fruta":{"base":"melón","por_equivalente":"~1 taza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"}},"tacos de requeson + pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"requesón ó pollo","por_equivalente":"2 cdas (~40g)"}},"tacos de salmon asado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"libres":"limon","proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos de salmon/pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"pescado ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tacos//tostadas de requeson":{"cereal":{"base":"tortilla de maíz ó salmas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"}},"tacos/tostadas de pescado":{"cereal":{"base":"tortilla de maíz ó tostadas horneadas","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pescado","por_equivalente":"30g cocido"}},"taquitos de huevo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"clara de huevo ó huevo","por_equivalente":"60ml"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"taquitos de pescado":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tinga deshebrada":{"cereal":{"base":"tortilla ó tostada","por_equivalente":"1 tortilla de maíz (30 g) ó 1 tostada de maíz (20 g)"},"verdura":{"base":"lechuga","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"tlacoyo":{"proteina":{"base":"queso panela ó huevo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tlacoyo de requeson":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó huevo","por_equivalente":"2 cdas (~40g)"}},"tlacoyo de requeson (3p,2c,1g)":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó huevo","por_equivalente":"2 cdas (~40g)"}},"tlacoyo de requeson + pavo":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"}},"tlacoyo de requeson pavo":{"cereal":{"base":"tlacoyo de maíz","por_equivalente":"~30 g de masa/eq (como tortilla de maíz)"},"verdura":{"base":"nopal","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"tlacoyos":{"libres":"salsa","proteina":{"base":"requesón ó pollo ó bistec","por_equivalente":"2 cdas (~40g)"}},"tlacoyos con nopal":{"cereal":{"base":"tlacoyo de maíz","por_equivalente":"~30 g de masa/eq (como tortilla de maíz)"},"verdura":{"base":"nopal","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"toast con crema de cacahuate":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"grasa":{"base":"crema de cacahuate","por_equivalente":"~20 g (ref. cacahuates)"}},"toast con crema de cacahuate y manzana":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"fruta":{"base":"manzana","por_equivalente":"100 g"},"grasa":{"base":"crema de cacahuate","por_equivalente":"~20 g (ref. cacahuates)"}},"toast con hummus y queso requeson":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast con mermelada":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"azucar":{"base":"mermelada sin azúcar","por_equivalente":"No está en la tabla (~libre)"}},"toast de aguacate y queso":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó queso cottage","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de atun":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de crema de cacahuate con mermelada y platano":{"cereal":{"base":"pan integral","por_equivalente":"27 g (1 rebanada)"},"fruta":{"base":"plátano","por_equivalente":"54 g"},"grasa":{"base":"crema de cacahuate","por_equivalente":"~20 g (ref. cacahuates)"}},"toast de panela y pavo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de pavo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de pavo panela":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"toast de salmon":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"requesón ó salmón","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de salmon ahumado":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de salmon con jocoque":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"jocoque ó salmón","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast de salmon con pan thins":{"cereal":{"base":"pan thins ó pan integral (bimbo/oroweat)","por_equivalente":"2 tapas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón ó salmón","por_equivalente":"2 cdas (~40g)"}},"toast de salmon y hummus":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"proteina":{"base":"queso mozzarella ó salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toast panela-pavo":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"toastadas de arroz inflado":{"cereal":{"base":"tostadas horneadas ó arroz","por_equivalente":"2 piezas"},"proteina":{"base":"requesón ó queso cottage ó pavo","por_equivalente":"2 cdas (~40g)"}},"tortilla espanola":{"cereal":{"base":"papa","por_equivalente":"68 g cocida"},"verdura":{"base":"cebolla","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"tortitas de carne de res con papas":{"cereal":{"base":"papa","por_equivalente":"~70g cocida"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostada de atun":{"cereal":{"base":"pan integral (bimbo/oroweat) ó salmas","por_equivalente":"1 rebanada"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"tostada de panela asado":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas ceviche de pescado":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"lacteo":{"base":"leche light","por_equivalente":"~240ml"},"proteina":{"base":"pescado","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas con jocoque y pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"jocoque ó pavo","por_equivalente":"3 cdas"}},"tostadas con pollo":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de aguacate y panela":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"}},"tostadas de atun":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"fruta":{"base":"berries","por_equivalente":"~1 taza"},"proteina":{"base":"atún","por_equivalente":"30g"}},"tostadas de atun a la mexicana":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"libres":"limon","proteina":{"base":"atún","por_equivalente":"30g"}},"tostadas de atun con guacamole":{"cereal":{"base":"tostada horneada","por_equivalente":"20 g"},"verdura":{"base":"lechuga/pepino","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"tostadas de atun con requeson":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"requesón ó atún","por_equivalente":"2 cdas (~40g)"}},"tostadas de atun fresco":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de atun o salmon ahumado o pavo":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"pavo ó atún ó salmón","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de cabra y huevo cocido":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"huevo","por_equivalente":"1 pieza"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de nopal con queso":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"queso oaxaca ó pollo","por_equivalente":"30g"}},"tostadas de panela":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela","por_equivalente":"30g"}},"tostadas de panela planchado y frijoles":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"queso panela","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de panela planchado y pollo":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"tostadas de panela planchado, pollo y frijoles":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"tostadas de pavo":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"}},"tostadas de pavo con salmas":{"cereal":{"base":"tostada horneada (Salmas)","por_equivalente":"~20 g"},"verdura":{"base":"lechuga, jitomate","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"}},"tostadas de pavo/panela":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"fruta":{"base":"papaya","por_equivalente":"~1 taza"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de pollo con aguacate":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"tostadas de pollo desmenuzado con aguacate":{"cereal":{"base":"rice cakes","por_equivalente":"2 piezas"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de pollo en salsa":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"tostadas de pollo en salsa verde":{"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de pollo frescas":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de requeson":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de requeson con atun y aguacate":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"libres":"limon","proteina":{"base":"requesón ó atún","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de salmon cocido":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"carne","por_equivalente":"30g cocida"}},"tostadas de sardinas o chapulines":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate ó aceite de oliva/aguacate","por_equivalente":"15–20g"}},"tostadas de tinga de pollo":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"salsa","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de tinga de pollo o salpicon":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas de verduras con panela":{"cereal":{"base":"tostada horneada","por_equivalente":"20 g"},"verdura":{"base":"a elegir","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"leguminosa":{"base":"frijol","por_equivalente":"85 g"}},"tostadas pavo-cabra":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"proteina":{"base":"pavo","por_equivalente":"30g / 2 rebanadas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas pavo-panela":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas/tacos de atun sellado":{"cereal":{"base":"tortilla de maíz ó tostadas horneadas","por_equivalente":"1 pieza"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostadas/tacos de requeson":{"cereal":{"base":"tortilla de maíz ó tostadas horneadas","por_equivalente":"1 pieza"},"proteina":{"base":"requesón ó pavo","por_equivalente":"2 cdas (~40g)"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostaditas con pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostaditas de atun":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"}},"tostaditas de pavo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"tostaditas de pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostaditas de pollo o atun":{"cereal":{"base":"salmas ó tostadas horneadas","por_equivalente":"1 paquete"},"libres":"limon","proteina":{"base":"pollo ó atún","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostaditas de requeson":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"requesón","por_equivalente":"2 cdas (~40g)"}},"tostaditas de salmon":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"libres":"limon","proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tostaditas de salmon ahumado":{"grasa":{"base":"aguacate ó mayonesa light","por_equivalente":"15–20g"},"proteina":{"base":"salmón","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tuna ,melt sandwich":{"cereal":{"base":"pan integral (bimbo/oroweat)","por_equivalente":"1 rebanada"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"atún","por_equivalente":"30g"}},"tuna bowl":{"cereal":{"base":"arroz ó quinoa","por_equivalente":"~50g cocido"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"tuna sandwich":{"cereal":{"base":"pan thins ó pan integral (bimbo/oroweat)","por_equivalente":"2 tapas"},"fruta":{"base":"manzana","por_equivalente":"1 pieza"},"grasa":{"base":"mayonesa light","por_equivalente":"1 cda"},"proteina":{"base":"atún","por_equivalente":"30g"}},"utilizar en total":{"cereal":{"base":"arroz","por_equivalente":"~50g cocido"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo ó atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"uvas":{"fruta":{"base":"uva","por_equivalente":"90 g"}},"vapor":{"cereal":{"base":"papa","por_equivalente":"~70g cocida"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"verduras rostizadas con pollo":{"verdura":{"base":"pimiento, calabaza, cebolla, brócoli","por_equivalente":"½ taza cocida ó 1 taza cruda (verdura libre)"},"cereal":{"base":"arroz (opcional)","por_equivalente":"45 g cocido"}},"volcan de pollo":{"cereal":{"base":"salmas","por_equivalente":"1 paquete"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"}},"volcanes de carne o pllo":{"cereal":{"base":"tostadas horneadas","por_equivalente":"2 piezas"},"proteina":{"base":"queso oaxaca ó pollo ó carne","por_equivalente":"30g"}},"volcanes de pollo":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"volcanes de pollo y queso":{"cereal":{"base":"tortilla de maíz","por_equivalente":"1 pieza"},"proteina":{"base":"queso panela ó pollo","por_equivalente":"30g"}},"waffle con platano, huevo y fresa":{"cereal":{"base":"harina de avena","por_equivalente":"20 g"},"fruta":{"base":"plátano + fresa","por_equivalente":"plátano 54 g · fresa 200 g (por eq c/u)"}},"waffles de platano healthy":{"cereal":{"base":"avena","por_equivalente":"~20g seca"},"fruta":{"base":"plátano","por_equivalente":"½ pieza"},"libres":"canela, vainilla","proteina":{"base":"huevo","por_equivalente":"1 pieza"}},"wok de verduras y pollo":{"cereal":{"base":"camote","por_equivalente":"~70g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de atun":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de atun o pavo o pollo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"pollo ó pavo ó atún","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de atun o pollo":{"cereal":{"base":"pan árabe integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó atún","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de huevo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"jocoque ó clara de huevo ó huevo","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de pavo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"jocoque ó pavo","por_equivalente":"3 cdas"}},"wrap de pavo o arrachera o pollo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso panela ó pavo","por_equivalente":"30g"}},"wrap de pollo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de pollo con pan pita":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"proteina":{"base":"pollo","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de pollo o huevo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó clara de huevo ó huevo","por_equivalente":"30g cocido"}},"wrap de pollo/salmon":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de salmon ahumado":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"grasa":{"base":"aceite de oliva/aguacate","por_equivalente":"1 cdita"},"libres":"limon","proteina":{"base":"jocoque ó salmón","por_equivalente":"3 cdas"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"wrap de salmon ahumado o atun en lata":{"cereal":{"base":"tortilla de maíz ó pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza"},"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"queso feta ó jocoque","por_equivalente":"30g"}},"wrap de salmon o pollo":{"cereal":{"base":"pan pita integral ó pan integral (bimbo/oroweat)","por_equivalente":"1 pieza chica"},"libres":"limon","proteina":{"base":"pollo ó salmón","por_equivalente":"30g cocido"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}},"yogurt con fresa y nuez":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"fresa","por_equivalente":"200 g"},"grasa":{"base":"nuez","por_equivalente":"10 g"}},"yogurt con mango y nuez":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"mango","por_equivalente":"110 g"},"grasa":{"base":"nuez","por_equivalente":"10 g"}},"yogurt con manzana y nuez":{"lacteo":{"base":"yogur griego natural","por_equivalente":"200 g"},"fruta":{"base":"manzana","por_equivalente":"100 g"},"grasa":{"base":"nuez","por_equivalente":"10 g"}},"½ aguacate relleno de atun":{"grasa":{"base":"aguacate","por_equivalente":"15–20g"},"proteina":{"base":"atún","por_equivalente":"30g"},"verdura":{"base":"verduras (a elegir)","por_equivalente":"al gusto"}}};
/* eslint-enable */
const _FR = { '½': .5, '¼': .25, '¾': .75, '⅓': 1/3, '⅔': 2/3, '⅛': .125 };
function _cnorm(s){ return (s||'').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function _cfmt(x){ x = Math.round(x*100)/100; if (Math.abs(x-Math.round(x))<1e-9) return String(Math.round(x));
  var ent=Math.trunc(x), fr=x-ent, F=[['½',.5],['¼',.25],['¾',.75],['⅓',1/3],['⅔',2/3]];
  for (var i=0;i<F.length;i++){ if (Math.abs(fr-F[i][1])<0.03) return (ent?String(ent):'')+F[i][0]; }
  return String(Math.round(x*10)/10); }
function _cval(t){ if (_FR[t]!=null) return _FR[t]; var m=/^(\d+)([½¼¾⅓⅔⅛])$/.exec(t); if (m) return parseInt(m[1],10)+_FR[m[2]]; var f=parseFloat(t); return isFinite(f)?f:null; }
var _CPL={pieza:'piezas',rebanada:'rebanadas',taza:'tazas',scoop:'scoops',cda:'cdas',cdita:'cditas',paquete:'paquetes',tapa:'tapas'};
function _cplural(suf,n){ if (n<=1) return suf; for (var s in _CPL){ var m=new RegExp('^('+s+')\\b(.*)$').exec(suf); if (m) return _CPL[s]+m[2]; } return suf; }
function _cescala(pe,mult){ var s=String(pe==null?'':pe).trim(); if (!s || /al gusto/i.test(s)) return 'al gusto'; if (mult<=0) return null;
  var m=/^(~?)\s*([\d½¼¾⅓⅔⅛.]+)\s*[–-]\s*([\d½¼¾⅓⅔⅛.]+)(.*)$/.exec(s);
  if (m){ var a=_cval(m[2]), b=_cval(m[3]); if (a!=null && b!=null) return (m[1]+_cfmt(a*mult)+'–'+_cfmt(b*mult)+m[4]).trim(); }
  m=/^(~?)\s*([\d½¼¾⅓⅔⅛]+(?:\.\d+)?)(\s*)(\S*)(.*)$/.exec(s);
  if (m){ var v=_cval(m[2]); if (v==null) return s; var n=v*mult; return (m[3] ? (m[1]+_cfmt(n)+' '+_cplural(m[4],n)+m[5]) : (m[1]+_cfmt(n)+m[4]+m[5])).trim(); }
  return s; }
function _ceqG(g,eq){ var N=function(i){ return num(eq && eq[i]); };
  if (g==='cereal') return N(0)+N(1); if (g==='proteina') return N(5)+N(6)+N(7)+N(8);
  if (g==='grasa') return N(13)+N(14); if (g==='fruta') return N(4); if (g==='verdura') return N(3);
  if (g==='lacteo') return N(9)+N(10)+N(11)+N(12);
  if (g==='leguminosa') return N(2); if (g==='azucar') return N(15)+N(16); return 0; }
var _CLBL={cereal:'Cereal',proteina:'Proteína',grasa:'Grasa',verdura:'Verdura',fruta:'Fruta',lacteo:'Lácteo',leguminosa:'Leguminosa',azucar:'Azúcar',libres:'Libres'};
// Devuelve el texto de "Preparación y gramajes" con las cantidades ya ajustadas a los
// equivalentes del tiempo + el método original. Si no hay componentes o no hay
// equivalentes en el tiempo, regresa la receta original tal cual.
function prepConGramajes(nombre, eq, recetaOriginal){
  try {
    var comp = COMPONENTES[_cnorm(nombre)];
    if (!comp) return recetaOriginal || '';
    var hayEq = Array.isArray(eq) && eq.some(function(x){ return num(x) > 0; });
    if (!hayEq) return recetaOriginal || '';
    var out = [], orden = ['cereal','proteina','leguminosa','verdura','fruta','grasa','lacteo','azucar','libres'];
    for (var i=0;i<orden.length;i++){ var g=orden[i]; if (!(g in comp)) continue; var info=comp[g];
      if (typeof info === 'string'){ out.push(_CLBL[g]+': '+info+' (al gusto)'); continue; }
      var base=info.base||'', pe=info.por_equivalente||'';
      if (g==='verdura'){ out.push(_CLBL[g]+': '+base+' — al gusto'); continue; }
      var c=_cescala(pe, _ceqG(g,eq)); if (c==null) continue;
      out.push(_CLBL[g]+': '+base+' — '+c);
    }
    if (!out.length) return recetaOriginal || '';
    // Extraer SOLO el método: si recetaOriginal ya trae una lista de componentes seguida de
    // "\n\nPreparación:", nos quedamos con lo que va después (evita duplicar la lista).
    var metodo = String(recetaOriginal || '');
    var _pi = metodo.indexOf('\n\nPreparación:');
    if (_pi !== -1) metodo = metodo.slice(_pi + 2).replace(/^Preparación:\s*/, '');
    metodo = metodo.trim();
    return out.join('\n') + (metodo ? ('\n\nPreparación: ' + metodo) : '');
  } catch (e) { return recetaOriginal || ''; }
}

const uid = () => Math.random().toString(36).slice(2, 9);

// fetch con RED DE SEGURIDAD de tiempo: NO es para cortar generaciones normales
// (una generación real suele tardar bastante menos de un minuto). Es solo el tope
// máximo (3 min por defecto) para el caso en que la conexión se cae de verdad y la
// petición se queda colgada para siempre: en vez de dejar el overlay pegado
// obligando a recargar, se aborta y se muestra un mensaje. La espera normal se
// acompaña con la barra de actividad y el cronómetro de la ventana de carga.
async function fetchIA(url, opts, ms = 180000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.code === 20)) {
      throw new Error('la conexión tardó demasiado y se canceló. Revisa tu internet e inténtalo de nuevo.');
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Formatea segundos como m:ss para el cronómetro de la ventana de carga.
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.max(0, s) % 60).padStart(2, '0');

// Clasifica un tiempo a una columna de GW [Desayuno, Col AM, Comida, Col PM, Cena]
// según su NOMBRE (y la hora como respaldo), NO según su posición.
function tiempoCol(nombre, hora) {
  const n = (nombre || '').toString().toLowerCase();
  if (/desayun/.test(n)) return 0;
  if (/comida|almuerz/.test(n)) return 2;
  if (/cena/.test(n)) return 4;
  const h = parseInt((hora || '').toString().slice(0, 2), 10);
  if (/colaci|refrig|snack|tentempi|merienda|entren|media/.test(n)) {
    if (/\bpm\b|tarde|noche|vesp/.test(n)) return 3;
    if (/\bam\b|mañ|matut/.test(n)) return 1;
    return (isFinite(h) && h >= 14) ? 3 : 1;
  }
  // nombre personalizado: clasifica por hora
  if (!isFinite(h)) return 2;
  if (h < 10) return 0;
  if (h < 12) return 1;
  if (h < 16) return 2;
  if (h < 19) return 3;
  return 4;
}

function distribuir(eqArr, nMeals, tiempos) {
  const meals = Array.from({ length: nMeals }, () => Array(18).fill(0));
  // Columna de pesos por cada tiempo: por NOMBRE/hora si se reciben los tiempos; si no, por posición.
  const cols = [];
  for (let m = 0; m < nMeals; m++) {
    const t = (tiempos && tiempos[m]) || null;
    cols.push(t ? tiempoCol(t.nombre, t.hora) : m);
  }
  for (let g = 0; g < 18; g++) {
    const total = num(eqArr[g]); // sin redondear: respeta el decimal del plan
    if (!total) continue;
    let w = [];
    for (let m = 0; m < nMeals; m++) { const c = cols[m]; w.push(GW[g] && GW[g][c] != null ? GW[g][c] : 0); }
    let sw = w.reduce((a, b) => a + b, 0);
    if (sw <= 0) { meals[Math.min(2, nMeals - 1)][g] = round2(total); continue; }
    w = w.map(x => x / sw);
    const half = w.map(x => Math.round(x * total * 2) / 2); // a 0.5 más cercano
    // El sobrante se carga al tiempo de mayor peso para que la suma == total del plan exacto.
    const diff = round2(total - half.reduce((a, b) => a + b, 0));
    if (diff !== 0) { let mi = 0; for (let m = 1; m < nMeals; m++) if (w[m] > w[mi]) mi = m; half[mi] = round2(half[mi] + diff); }
    for (let m = 0; m < nMeals; m++) meals[m][g] = half[m];
  }
  return meals;
}

function compressImage(file, maxW = 620, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

const nuevaOpcion = () => ({ nombre: '', prep: '', fotoKey: '', fotoAuto: true });
// Asegura que una opción tenga foto: si no la tiene (o está en "auto"), la empareja por su nombre.
function conFotoAuto(o) {
  const base = { nombre: '', prep: '', fotoAuto: true, ...o };
  // Autoasigna foto SIEMPRE que la opción no tenga ya una: una opción sin foto no
  // tiene nada manual que proteger, así que se empareja por su nombre (aunque venga
  // guardada con fotoAuto:false). Las fotos elegidas a mano tienen fotoKey con valor,
  // por lo que quedan intactas. El candado de confianza de matchFoto sigue aplicando.
  if (!base.fotoKey) { base.fotoKey = matchFotoKey(base.nombre); base.fotoAuto = true; }
  return base;
}
const opcionesArr = (n) => Array.from({ length: Math.max(1, n || 1) }, nuevaOpcion);
function nuevoTiempo(def, eqRow, nOp = 3) {
  return { id: uid(), nombre: def?.nombre || 'Nuevo tiempo', hora: def?.hora || '12:00', eq: eqRow || Array(18).fill(0), opciones: opcionesArr(nOp), foto: '', indicacion: '' };
}


/* ---- Panel de notas de seguimiento (incluido aquí para no depender de otro archivo) ---- */
/* Panel lateral de solo lectura con las notas de seguimiento del paciente.
   Se usa desde el Plan nutricional y desde Menús para consultarlas sin salir
   de la pantalla. Las notas viven en patient.bitacora: { fecha, texto, apego? }. */

const fmtFechaNota_ = (ms) => {
  try {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  } catch (e) { return ''; }
};

function NotasSeguimiento({ notas, nombre, onClose, closeBtnStyle }) {
  const lista = Array.isArray(notas)
    ? [...notas].sort((a, b) => (b.fecha || 0) - (a.fecha || 0))
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ position: 'relative', width: 'min(640px, 94vw)', height: '100%', background: 'var(--cream)', boxShadow: '-10px 0 30px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--card)' }}>
          <span style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>
            Notas de seguimiento{nombre ? ' · ' + nombre : ''}{' '}
            <span style={{ fontWeight: 400, color: 'var(--stone)', fontSize: 12 }}>(solo lectura)</span>
          </span>
          <button style={closeBtnStyle} onClick={onClose}>Cerrar ✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: 16 }}>
          {lista.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '20px 16px', textAlign: 'center', color: 'var(--stone)', fontSize: 13, lineHeight: 1.55, fontFamily: 'var(--font)' }}>
              El paciente aún no cuenta con notas de seguimiento.
            </div>
          ) : lista.map((n, i) => {
            const ap = parseFloat(n && n.apego);
            return (
              <div key={i} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, fontFamily: 'var(--font)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: 1, color: 'var(--stone)', fontWeight: 700 }}>{fmtFechaNota_(n && n.fecha)}</span>
                  {isFinite(ap) && (
                    <span style={{ background: 'var(--mint)', color: 'var(--dark)', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Apego {ap}%</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{(n && n.texto) || ''}</div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}


/* La IA a veces devuelve los títulos con Cada Palabra En Mayúscula.
   Los normalizamos a "solo la primera palabra con mayúscula".
   Las siglas en mayúsculas (p. ej. BCAA) se respetan. */
const tituloOracion = (txt) => {
  const t = (txt || '').toString().trim();
  if (!t) return '';
  // Si el título viene TODO en mayúsculas, no hay siglas que respetar: se pasa completo a minúsculas.
  const todoMayus = t === t.toLocaleUpperCase('es-MX');
  let primera = true;
  return t.split(/(\s+)/).map((w) => {
    if (!w || /^\s+$/.test(w)) return w;
    if (!todoMayus && /^[A-ZÁÉÍÓÚÑÜ0-9]{2,}$/.test(w)) return w;   // siglas: BCAA, EGO
    const min = w.toLocaleLowerCase('es-MX');
    if (primera) { primera = false; return min.charAt(0).toLocaleUpperCase('es-MX') + min.slice(1); }
    return min;
  }).join('');
};

export default function Menus({ patient, onBack, initialMenus = null, onGuardChange }) {
  const plan = patient.plan || {};
  const ultimaNota = (() => {
    const b = Array.isArray(patient.bitacora) ? patient.bitacora : [];
    if (!b.length) return null;
    return b.slice().sort((a, c) => (c.fecha || 0) - (a.fecha || 0))[0];
  })();
  const planEq = Array.isArray(plan.eq) ? plan.eq.map(num) : null;
  const usados = planEq ? planEq.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0) : [];

  const savedMenus = (initialMenus && Array.isArray(initialMenus.tiempos) && initialMenus.tiempos.length)
    ? initialMenus
    : (plan.menus && Array.isArray(plan.menus.tiempos) && plan.menus.tiempos.length ? plan.menus : null);
  const savedNOp = savedMenus ? (savedMenus.nOpciones || (savedMenus.tiempos[0]?.opciones?.length) || 3) : 3;

  const [tiempos, setTiempos] = useState(() => {
    if (savedMenus) return savedMenus.tiempos.map(t => ({ ...t, id: t.id || uid(), eq: Array.isArray(t.eq) ? t.eq : Array(18).fill(0), opciones: ((t.opciones && t.opciones.length) ? t.opciones : opcionesArr(savedNOp)).map(conFotoAuto) }));
    return []; // los menús nuevos se arman tras la ventana de configuración
  });
  const [nOpciones, setNOpciones] = useState(savedNOp);
  const [status, setStatus] = useState(savedMenus ? 'guardado' : 'nuevo');

  // Si hay borrador y el plan cambió su distribución de equivalentes desde que se guardó, preguntamos qué hacer.
  const planCambio = !!(savedMenus && Array.isArray(savedMenus.planEq) && planEq && JSON.stringify(savedMenus.planEq) !== JSON.stringify(planEq));
  const [showBorradorModal, setShowBorradorModal] = useState(planCambio);

  // Carga las imágenes guardadas (documento aparte) y las une a los tiempos por su id.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'menuFotos', patient.id));
        if (cancel || !snap.exists()) return;
        const fotos = (snap.data() || {}).fotos || {};
        if (!Object.keys(fotos).length) return;
        setTiempos(ts => ts.map(t => (fotos[t.id] ? { ...t, foto: fotos[t.id] } : t)));
      } catch (_) { /* si no se pueden leer, el menú sigue funcionando sin imágenes */ }
    })();
    return () => { cancel = true; };
  }, [patient.id]);
  const [rep, setRep] = useState('');
  const [iaBusy, setIaBusy] = useState(false);
  const [cargaSeg, setCargaSeg] = useState(0);   // cronómetro de la ventana de carga
  // Consideración GENERAL para la IA (aplica a todo el plan, no a un tiempo puntual).
  const [consideracionGral, setConsideracionGral] = useState('');
  const [verHistoria, setVerHistoria] = useState(false);
  const [verNotas, setVerNotas] = useState(false);
  const [opBusy, setOpBusy] = useState(''); // "idx:oi" de la opción que se está generando
  const [ajuBusy, setAjuBusy] = useState(''); // "idx:oi" de la opción cuyos gramajes se están ajustando
  const [listas, setListas] = useState(null);
  const [listaBusy, setListaBusy] = useState(false);
  const [showLista, setShowLista] = useState(false);
  const [showScope, setShowScope] = useState(false);
  const [listaErr, setListaErr] = useState('');
  const [showSeg, setShowSeg] = useState(false);   // modal "Aplicar cambios de seguimiento"
  const [segNota, setSegNota] = useState('');
  const [segBusy, setSegBusy] = useState(false);

  // Ventana de configuración: aparece al abrir menús cuando aún no hay configuración guardada.
  const [showCfg, setShowCfg] = useState(!savedMenus);
  const [cfgNOp, setCfgNOp] = useState(savedNOp);
  const [cfgTiempos, setCfgTiempos] = useState(() => savedMenus ? savedMenus.tiempos.map(t => ({ nombre: t.nombre, hora: t.hora })) : DEFAULT_TIEMPOS.map(d => ({ ...d })));
  const [cfgDragIdx, setCfgDragIdx] = useState(null);
  const [cfgOverIdx, setCfgOverIdx] = useState(null);

  const touch = () => setStatus('nuevo');

  // --- Aviso de cambios sin guardar al salir ---
  const [exitModal, setExitModal] = useState(null); // { proceed } | null
  const hayContenido = tiempos.some(t => (t.opciones || []).some(o => (o.nombre || '').trim() || (o.prep || '').trim()));
  const dirty = hayContenido && status !== 'guardado';
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const requestExit = useCallback((proceed) => {
    if (dirtyRef.current) setExitModal({ proceed: (typeof proceed === 'function' ? proceed : () => {}) });
    else if (typeof proceed === 'function') proceed();
  }, []);
  useEffect(() => {
    if (onGuardChange) onGuardChange(requestExit);
    return () => { if (onGuardChange) onGuardChange(null); };
  }, [onGuardChange, requestExit]);
  const salirAhora = () => { const p = exitModal && exitModal.proceed; setExitModal(null); if (p) p(); };
  const guardarYSalir = async () => { const p = exitModal && exitModal.proceed; const ok = await guardarBorrador(); if (ok) { setExitModal(null); if (p) p(); } };
  const setT = (idx, patch) => { setTiempos(ts => ts.map((t, i) => i === idx ? { ...t, ...patch } : t)); touch(); };

  // El popup del borrador: descartar lo guardado y reconfigurar el menú desde el plan actual.
  const empezarDesdeCero = () => {
    setShowBorradorModal(false);
    setTiempos([]);
    setStatus('nuevo');
    setShowCfg(true);
  };
  const setEqCell = (idx, g, v) => setT(idx, { eq: tiempos[idx].eq.map((x, k) => k === g ? String(v).replace(',', '.') : x) });
  const setOpcion = (idx, oi, patch) => setT(idx, { opciones: tiempos[idx].opciones.map((o, k) => k === oi ? { ...o, ...patch } : o) });
  // Cambia el nombre de una opción y, si su foto está en "auto", la vuelve a emparejar.
  const setOpcionNombre = (idx, oi, val) => {
    const o = (tiempos[idx].opciones[oi]) || {};
    const patch = { nombre: val };
    if (o.fotoAuto !== false) { patch.fotoKey = matchFotoKey(val); patch.fotoAuto = true; }
    setOpcion(idx, oi, patch);
    // Mientras reescribe el nombre, quita el aviso de "elige de la lista" de esa opción.
    setAvisoReceta(a => (a && a.idx === idx && a.oi === oi) ? null : a);
  };
  // Foto elegida a mano (deja de ser "auto").
  const setOpcionFoto = (idx, oi, key) => setOpcion(idx, oi, { fotoKey: key || '', fotoAuto: false });
  // Elegir un platillo desde el desplegable de sugerencias: jala la foto Y también
  // el nombre y la receta base (si el platillo del banco la tiene). Así se evita
  // escribir todo: se busca, se elige y queda cargado nombre + receta + foto.
  const elegirPlatilloSugerido = (idx, oi, f) => {
    const patch = { fotoKey: f.file || '', fotoAuto: false };
    if (f.label) patch.nombre = f.label;
    if (f.receta) patch.prep = prepConGramajes(f.label || f.nombre || '', (tiempos[idx] && tiempos[idx].eq) || [], f.receta);
    setOpcion(idx, oi, patch);
    setSugerFoto(null);
    setAvisoReceta(a => (a && a.idx === idx && a.oi === oi) ? null : a);
  };
  // Al TECLEAR (no solo al elegir del desplegable) el nombre de un platillo que existe
  // en el recetario CON receta, carga su receta base (ingredientes + preparación) si la
  // preparación está vacía. Así, escribir un platillo conocido trae sus ingredientes e
  // instrucciones sin tener que abrir el desplegable. Solo con coincidencia EXACTA del
  // nombre (normalizado) para no cargar una receta equivocada a medio escribir; y nunca
  // pisa una preparación ya escrita. Usa el estado más reciente (updater funcional) para
  // no chocar con una elección del desplegable hecha un instante antes.
  const autocargarRecetaSiVacia = (idx, oi) => {
    let cambio = false;
    let sugerirLista = false;   // hay platillos con receta pero ninguno coincide EXACTO → avisar
    setTiempos(ts => {
      const t = ts[idx]; if (!t) return ts;
      const o = (t.opciones && t.opciones[oi]) || {};
      const nombre = (o.nombre || '').trim();
      if (!nombre || (o.prep || '').trim()) return ts;   // ya tiene preparación o no hay nombre
      const sug = buscarFotos(nombre, 6);
      if (!sug || !sug.length) return ts;
      const norm = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const cand = sug.find(f => norm(f.label) === norm(nombre) && f.receta);
      if (!cand || !cand.receta) {
        // No hubo coincidencia exacta. Si en la lista hay platillos CON receta, marcamos
        // que se muestre el aviso para que la persona elija uno (no cargamos nada solos).
        if (sug.some(f => f.receta)) sugerirLista = true;
        return ts;
      }
      cambio = true;
      return ts.map((tt, i) => i !== idx ? tt : {
        ...tt,
        opciones: (tt.opciones || []).map((oo, k) => {
          if (k !== oi) return oo;
          const patch = { ...oo, prep: prepConGramajes(cand.label || nombre, t.eq, cand.receta) };
          if (!oo.fotoKey && cand.file) { patch.fotoKey = cand.file; patch.fotoAuto = true; }
          return patch;
        }),
      });
    });
    if (cambio) { setAvisoReceta(a => (a && a.idx === idx && a.oi === oi) ? null : a); touch(); }
    else setAvisoReceta(sugerirLista ? { idx, oi } : (a => (a && a.idx === idx && a.oi === oi) ? null : a));
  };
  // Reescribe SOLO los gramajes de una opción para que cuadren con las equivalencias de
  // su tiempo (mismo platillo, mismos alimentos). Reusa el motor escalarGramajesIA del
  // backend, aplicado a una sola opción, así el ajuste es rápido y acotado.
  const ajustarGramajesOpcion = async (idx, oi) => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    const t = tiempos[idx];
    const o = (t && t.opciones && t.opciones[oi]) || {};
    if (!(o.nombre || '').trim() && !(o.prep || '').trim()) { setRep('Escribe o carga primero el platillo (nombre y preparación) para poder ajustar sus gramajes.'); return; }
    const equivalentes = t.eq.map((n, g) => ({ grupo: GRUPOS[g][0], n: round2(num(n)) })).filter(x => x.n > 0);
    if (!equivalentes.length) { setRep('Este tiempo no tiene equivalentes asignados; no hay a qué ajustar los gramajes.'); return; }
    // Si el platillo está estructurado, ajustamos con el MOTOR DETERMINISTA (mismo formato que el
    // auto-cargado, instantáneo y sin IA). Solo caemos a la IA para platillos no estructurados.
    if (COMPONENTES[_cnorm(o.nombre || '')]) {
      const prepDet = prepConGramajes(o.nombre || '', t.eq, o.prep || '');
      setOpcion(idx, oi, { prep: prepDet }); touch();
      setRep('Gramajes de la opción ' + (oi + 1) + ' de ' + t.nombre + ' ajustados a las equivalencias (cálculo exacto). Revísalos antes de guardar.');
      return;
    }
    setAjuBusy(idx + ':' + oi); setRep('Ajustando los gramajes de la opción ' + (oi + 1) + ' de ' + t.nombre + ' a las equivalencias del tiempo…');
    try {
      const res = await fetchIA(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'escalarGramajesIA', tiempos: [{ nombre: t.nombre, equivalentes, opciones: [{ nombre: o.nombre || '', prep: o.prep || '' }] }] }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      const nueva = data && data.ok && Array.isArray(data.tiempos) && data.tiempos[0] && Array.isArray(data.tiempos[0].opciones) ? data.tiempos[0].opciones[0] : null;
      if (!nueva) throw new Error((data && data.error) || 'No se recibió la preparación ajustada.');
      setOpcion(idx, oi, { prep: (nueva.prep || o.prep || '') });
      setRep('Gramajes de la opción ' + (oi + 1) + ' de ' + t.nombre + ' ajustados a las equivalencias. Revísalos antes de guardar.');
    } catch (e) {
      setRep('No se pudieron ajustar los gramajes: ' + e.message);
    }
    setAjuBusy('');
  };
  const [fotoPicker, setFotoPicker] = useState(null);   // { idx, oi } de la opción cuya foto se está eligiendo
  const [fotoQuery, setFotoQuery] = useState('');
  const [fotoPage, setFotoPage] = useState(0);          // paginación del banco de imágenes
  const [bancoCustom, setBancoCustomState] = useState([]);
  const [subiendoBanco, setSubiendoBanco] = useState(false);
  const [dragBanco, setDragBanco] = useState(false);
  // Autocompletado del banco de fotos al escribir el nombre del platillo:
  // guarda { idx, oi } de la opción cuyo input está enfocado (para mostrar
  // el desplegable de sugerencias solo en esa opción).
  const [sugerFoto, setSugerFoto] = useState(null);
  // { idx, oi } de la opción donde se tecleó un nombre que NO coincide EXACTO con un
  // platillo del recetario con receta, pero sí hay sugerencias con receta disponibles.
  // Mantiene la lista abierta con un aviso para que la persona elija de ahí. Se limpia
  // al elegir un platillo, al retomar el nombre o cuando ya hay preparación.
  const [avisoReceta, setAvisoReceta] = useState(null);
  // Banco de fotos DINÁMICO (fotos que sube la nutrióloga), guardado en Firestore.
  useEffect(() => onSnapshot(collection(db, 'bancoFotos'), snap => {
    const arr = snap.docs.map(d => d.data());
    setBancoCustom(arr);        // registro para el emparejador y fotoUrl
    setBancoCustomState(arr);   // provoca re-render
  }, () => {}), []);
  // Sube una foto nueva, la guarda en la biblioteca con el nombre del platillo y la asigna a la opción.
  const subirFotoBanco = async (idx, oi, file) => {
    if (!file || !(file.type || '').startsWith('image/')) return;
    const o = (tiempos[idx] && tiempos[idx].opciones[oi]) || {};
    const nombre = (o.nombre || '').trim();
    if (!nombre) { alert('Escribe primero el nombre del platillo: la foto se guarda en la biblioteca con ese nombre.'); return; }
    setSubiendoBanco(true);
    try {
      const dataUri = await compressImage(file);
      const slug = slugPlatillo(nombre);
      const entrada = { slug, label: nombre, keys: keysDeNombre(nombre), dataUri, creadoEn: new Date().toISOString() };
      await setDoc(doc(db, 'bancoFotos', slug), entrada, { merge: true });
      const nuevo = [...bancoCustom.filter(x => x.slug !== slug), entrada];
      setBancoCustom(nuevo); setBancoCustomState(nuevo);   // la miniatura aparece de inmediato
      setOpcionFoto(idx, oi, 'custom:' + slug);
      setFotoPicker(null);
    } catch (e) {
      alert('No se pudo subir la foto: ' + (e.code || e.message) + '. Prueba con otra imagen (JPG o PNG).');
    } finally {
      setSubiendoBanco(false);
    }
  };
  const onSubirBanco = (idx, oi, e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; subirFotoBanco(idx, oi, f); };
  const onDropBanco = (idx, oi, e) => { e.preventDefault(); setDragBanco(false); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; subirFotoBanco(idx, oi, f); };
  const setPorciones = (idx, val) => {
    const t = tiempos[idx];
    const patch = { porciones: val };
    if (val && t.porcionesTexto == null) patch.porcionesTexto = generarPorcionesTexto(t.eq); // prellenar al activar
    setT(idx, patch);
  };
  const setPorcionesTexto = (idx, val) => setT(idx, { porcionesTexto: val });
  const regenerarPorciones = (idx) => setT(idx, { porcionesTexto: generarPorcionesTexto(tiempos[idx].eq) });

  const redistribuir = () => {
    if (!planEq) return;
    const dist = distribuir(planEq, tiempos.length, tiempos);
    setTiempos(ts => ts.map((t, m) => ({ ...t, eq: dist[m] }))); touch();
  };
  const addTiempo = () => { setTiempos(ts => [...ts, nuevoTiempo({ nombre: 'Nuevo tiempo', hora: '12:00' }, Array(18).fill(0), nOpciones)]); touch(); };
  const delTiempo = (idx) => { setTiempos(ts => ts.filter((_, i) => i !== idx)); touch(); };

  // ── Configuración (ventana emergente): número de tiempos y de opciones ──
  const cfgSetN = (n) => {
    n = Math.max(1, Math.min(8, n));
    setCfgTiempos(ts => {
      const out = ts.slice(0, n);
      while (out.length < n) { const i = out.length; const d = DEFAULT_TIEMPOS[i] || { nombre: 'Tiempo ' + (i + 1), hora: '12:00' }; out.push({ ...d }); }
      return out;
    });
  };
  const cfgSetTiempo = (i, patch) => setCfgTiempos(ts => ts.map((t, k) => k === i ? { ...t, ...patch } : t));
  const cfgReordenar = (from, to) => {
    setCfgTiempos(ts => {
      if (from == null || to == null || to < 0 || to >= ts.length || from === to) return ts;
      const out = ts.slice();
      const [m] = out.splice(from, 1);
      out.splice(to, 0, m);
      return out;
    });
  };
  const cfgMover = (i, dir) => cfgReordenar(i, i + dir);
  const aplicarConfig = () => {
    const nOp = Math.max(1, Math.min(6, cfgNOp));
    const defs = cfgTiempos;
    const dist = planEq ? distribuir(planEq, defs.length, defs) : defs.map(() => Array(18).fill(0));
    setTiempos(defs.map((d, m) => nuevoTiempo(d, dist[m], nOp)));
    setNOpciones(nOp);
    setShowCfg(false); setStatus('nuevo'); setRep('');
  };


  const generarIA = async () => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    if (!planEq) return;
    const idxIA = tiempos.map((t, i) => esPorciones(t) ? -1 : i).filter(i => i >= 0);
    if (!idxIA.length) { setRep('No hay tiempos con opciones para generar (los tiempos en modo porciones no usan IA).'); return; }
    setIaBusy(true); setRep('Generando menús con IA… (puede tardar unos segundos)');
    try {
      const payloadTiempos = idxIA.map(i => {
        const t = tiempos[i];
        const en = t.eq.reduce((a, _, g) => ({
          kcal: a.kcal + num(t.eq[g]) * GRUPOS[g][1], prot: a.prot + num(t.eq[g]) * GRUPOS[g][2],
          lip: a.lip + num(t.eq[g]) * GRUPOS[g][3], hc: a.hc + num(t.eq[g]) * GRUPOS[g][4],
        }), { kcal: 0, prot: 0, lip: 0, hc: 0 });
        const equivalentes = t.eq.map((n, g) => ({ grupo: GRUPOS[g][0], n: round2(num(n)) })).filter(x => x.n > 0);
        const ind = (t.indicacion || '').trim();
        const evitar = (t.opciones || []).map(o => (o.nombre || '').trim()).filter(Boolean);
        // La indicación viaja en su propio campo: si se pega al nombre, la IA la copia
        // literal y devuelve siempre el mismo platillo.
        return { nombre: t.nombre, hora: t.hora, indicacion: ind, equivalentes, objetivoMacros: { kcal: r0(en.kcal), prot: r0(en.prot), lip: r0(en.lip), hc: r0(en.hc) }, evitar };
      });
      const res = await fetchIA(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generarMenusIA', objetivo: patient.objetivo || '', consideraciones: (consideracionGral || '').trim(), totales: plan.totales || {}, tiempos: payloadTiempos, nOpciones, gustos: ((patient.historia && patient.historia.dietetica && patient.historia.dietetica.leGusta) || '').trim(), disgustos: ((patient.historia && patient.historia.dietetica && patient.historia.dietetica.noLeGusta) || '').trim(), alergias: ((patient.historia && patient.historia.dietetica && patient.historia.dietetica.alergias) || '').trim() }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (!data.ok || !Array.isArray(data.tiempos)) throw new Error(data.error || 'No se recibieron menús.');
      setTiempos(ts => {
        const next = ts.slice();
        const aiList = Array.isArray(data.tiempos) ? data.tiempos.slice() : [];
        const usados = new Array(aiList.length).fill(false);
        const norm = (s) => (s || '').toString().trim().toLowerCase();
        idxIA.forEach((origIdx, k) => {
          const objetivo = norm(payloadTiempos[k] && payloadTiempos[k].nombre);
          // 1) empareja por NOMBRE (el que devuelve la IA), 2) si no, por posición k, 3) primer libre
          let ridx = objetivo ? aiList.findIndex((r, j) => !usados[j] && r && norm(r.nombre) === objetivo) : -1;
          if (ridx < 0) ridx = (aiList[k] && !usados[k]) ? k : aiList.findIndex((r, j) => !usados[j]);
          if (ridx < 0) return;
          usados[ridx] = true;
          const r = aiList[ridx];
          if (!r || !Array.isArray(r.opciones)) return;
          const ops = r.opciones.slice(0, nOpciones).map(o => conFotoAuto({ nombre: tituloOracion(o && o.nombre), prep: (o && o.prep) || '' }));
          while (ops.length < nOpciones) ops.push(nuevaOpcion());
          next[origIdx] = { ...next[origIdx], opciones: ops };
        });
        return next;
      });
      setStatus('nuevo');
      setRep('Menús generados por IA. Revísalos y edítalos antes de guardar.');
    } catch (e) {
      setRep('No se pudo generar con IA: ' + e.message);
    }
    setIaBusy(false);
  };

  const aplicarCambiosSeg = async () => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    const nota = (segNota || '').trim();
    if (!nota) { setRep('Escribe o pega el cambio a aplicar.'); return; }
    const idxIA = tiempos.map((t, i) => esPorciones(t) ? -1 : i).filter(i => i >= 0);
    if (!idxIA.length) { setRep('No hay tiempos con platillos para ajustar (los tiempos en modo porciones se editan a mano).'); return; }
    setSegBusy(true); setRep('Aplicando cambios de seguimiento con IA…');
    try {
      const payloadTiempos = idxIA.map(i => {
        const t = tiempos[i];
        return { nombre: t.nombre, hora: t.hora, opciones: (t.opciones || []).map(o => ({ nombre: o.nombre || '', prep: o.prep || '' })) };
      });
      const res = await fetchIA(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ajustarMenuIA', objetivo: patient.objetivo || '', nota, tiempos: payloadTiempos }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (!data.ok || !Array.isArray(data.tiempos)) throw new Error(data.error || 'No se recibió el menú ajustado.');
      setTiempos(ts => {
        const next = ts.slice();
        idxIA.forEach((origIdx, k) => {
          const r = data.tiempos[k];
          if (!r || !Array.isArray(r.opciones)) return;
          const orig = next[origIdx];
          const nOps = (orig.opciones || []).length || 1;
          const ops = r.opciones.slice(0, nOps).map(o => conFotoAuto({ nombre: tituloOracion(o && o.nombre), prep: (o && o.prep) || '' }));
          while (ops.length < nOps) ops.push(nuevaOpcion());
          next[origIdx] = { ...orig, opciones: ops };
        });
        return next;
      });
      setStatus('nuevo');
      setShowSeg(false);
      setRep('Cambios de seguimiento aplicados. Revisa y edita los platillos antes de guardar como versión nueva.');
    } catch (e) {
      setRep('No se pudieron aplicar los cambios: ' + e.message);
    }
    setSegBusy(false);
  };

  const generarOpcionIA = async (idx, oi) => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.'); return; }
    const t = tiempos[idx];
    setOpBusy(idx + ':' + oi); setRep('Generando la opción ' + (oi + 1) + ' de ' + t.nombre + '…');
    try {
      const en = t.eq.reduce((a, _, g) => ({
        kcal: a.kcal + num(t.eq[g]) * GRUPOS[g][1], prot: a.prot + num(t.eq[g]) * GRUPOS[g][2],
        lip: a.lip + num(t.eq[g]) * GRUPOS[g][3], hc: a.hc + num(t.eq[g]) * GRUPOS[g][4],
      }), { kcal: 0, prot: 0, lip: 0, hc: 0 });
      const equivalentes = t.eq.map((n, g) => ({ grupo: GRUPOS[g][0], n: round2(num(n)) })).filter(x => x.n > 0);
      const evitar = (t.opciones || []).map(o => (o.nombre || '').trim()).filter(Boolean);
      const indOp = (t.indicacion || '').trim();
      const payloadTiempos = [{ nombre: t.nombre, hora: t.hora, indicacion: indOp, equivalentes, objetivoMacros: { kcal: r0(en.kcal), prot: r0(en.prot), lip: r0(en.lip), hc: r0(en.hc) }, evitar }];
      const res = await fetchIA(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generarMenusIA', regenerar: true, objetivo: patient.objetivo || '', consideraciones: (consideracionGral || '').trim(), totales: plan.totales || {}, tiempos: payloadTiempos, nOpciones: 1, gustos: ((patient.historia && patient.historia.dietetica && patient.historia.dietetica.leGusta) || '').trim(), disgustos: ((patient.historia && patient.historia.dietetica && patient.historia.dietetica.noLeGusta) || '').trim(), alergias: ((patient.historia && patient.historia.dietetica && patient.historia.dietetica.alergias) || '').trim() }),
        redirect: 'follow',
      });
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      const nueva = data && data.ok && Array.isArray(data.tiempos) && data.tiempos[0] && Array.isArray(data.tiempos[0].opciones) ? data.tiempos[0].opciones[0] : null;
      if (!nueva) throw new Error((data && data.error) || 'No se recibió la opción.');
      const patchOp = { nombre: tituloOracion(nueva.nombre), prep: nueva.prep || '' };
      // Al regenerar se obtiene un platillo NUEVO, así que la foto anterior ya no
      // aplica: se re-empareja siempre por el nuevo nombre (sin importar fotoAuto).
      patchOp.fotoKey = matchFotoKey(patchOp.nombre); patchOp.fotoAuto = true;
      setOpcion(idx, oi, patchOp);
      setRep('Opción ' + (oi + 1) + ' de ' + t.nombre + ' regenerada. Revísala antes de guardar.');
    } catch (e) {
      setRep('No se pudo generar la opción: ' + e.message);
    }
    setOpBusy('');
  };

  // ── Lista del súper: una lista por opción, para 5 días ──
  const construirOpcionesLista = () => {
    const opciones = [];
    for (let oi = 0; oi < nOpciones; oi++) {
      const platillos = tiempos
        .filter(t => !esPorciones(t))
        .map(t => ({ tiempo: t.nombre, nombre: (t.opciones[oi] && t.opciones[oi].nombre) || '', prep: (t.opciones[oi] && t.opciones[oi].prep) || '' }))
        .filter(p => p.nombre || p.prep);
      if (platillos.length) opciones.push({ opcion: oi + 1, platillos });
    }
    return opciones;
  };
  const pedirListasIA = async () => {
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) throw new Error('Falta configurar REACT_APP_APPSCRIPT_URL en Vercel.');
    const opciones = construirOpcionesLista();
    if (!opciones.length) return [];
    const res = await fetchIA(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'listaSuperIA', dias: 5, objetivo: patient.objetivo || '', opciones }),
      redirect: 'follow',
    });
    let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
    if (!data.ok || !Array.isArray(data.listas)) throw new Error(data.error || 'No se recibió la lista.');
    return data.listas;
  };

  const generarListaSuper = async () => {
    if (!construirOpcionesLista().length) { setRep('Primero escribe o genera los platillos de los menús.'); return; }
    setListaBusy(true); setShowLista(true); setListas(null); setListaErr('');
    try {
      setListas(await pedirListasIA());
    } catch (e) {
      setListaErr('No se pudo generar la lista: ' + e.message);
    }
    setListaBusy(false);
  };
  const listaATexto = (L) => {
    let s = 'LISTA DEL SÚPER · Opción ' + L.opcion + ' · 5 días\n';
    (L.categorias || []).forEach(c => {
      s += '\n' + (c.nombre || '').toUpperCase() + '\n';
      (c.items || []).forEach(it => { s += '• ' + it.insumo + (it.cantidad ? ' — ' + it.cantidad : '') + '\n'; });
    });
    return s.trim();
  };
  const copiarLista = (L) => {
    try { navigator.clipboard.writeText(listaATexto(L)); setRep('Lista de la Opción ' + L.opcion + ' copiada al portapapeles.'); }
    catch (_) { setRep('No se pudo copiar automáticamente; selecciona y copia el texto.'); }
  };

  // Las imágenes (base64) NO se guardan en el documento del paciente (lo inflarían y rebasaría 1 MB);
  // van en un documento aparte 'menuFotos/{pacienteId}', indexadas por el id del tiempo.
  const tiemposSinFoto = () => tiempos.map(t => ({ ...t, foto: '' }));
  const guardarFotos = async () => {
    const fotos = {};
    tiempos.forEach(t => { if (t.id && typeof t.foto === 'string' && t.foto.startsWith('data:')) fotos[t.id] = t.foto; });
    await setDoc(doc(db, 'menuFotos', patient.id), { fotos }, { merge: false });
  };

  const guardarBorrador = async () => {
    setStatus('guardando'); setRep('Guardando borrador…');
    try {
      await updateDoc(doc(db, 'pacientes', patient.id), { 'plan.menus': { tiempos: tiemposSinFoto(), nOpciones, planEq: planEq || [] } });
    } catch (e) {
      setStatus('error'); setRep('No se pudo guardar el borrador: ' + e.message);
      return false;
    }
    // Las imágenes van en un documento aparte; si fallan (p. ej. reglas de Firestore), NO se pierde el texto.
    try {
      await guardarFotos();
      setStatus('guardado'); setRep('Borrador guardado ✓ (texto e imágenes). Puedes salir y retomarlo después.');
    } catch (e) {
      setStatus('guardado'); setRep('Borrador guardado ✓ (el texto quedó bien), pero las imágenes no se pudieron guardar: ' + (e.code || e.message) + '. Falta permitir la colección "menuFotos" en las reglas de Firestore.');
    }
    return true;
  };

  const guardarConAlcance = async (scope) => {
    setShowScope(false);
    const incluirMenus = scope !== 'equivalencias';
    const incluirEquivalencias = scope !== 'menus';
    setStatus('guardando'); setRep('Guardando menús…');
    // 1) Guardar SIEMPRE los menús primero (un fallo del PDF no debe hacer perder el trabajo).
    try {
      await updateDoc(doc(db, 'pacientes', patient.id), { 'plan.menus': { tiempos: tiemposSinFoto(), nOpciones } });
    } catch (e) {
      setStatus('error'); setRep('No se pudieron guardar los menús: ' + e.message); return;
    }
    // Las imágenes van en un documento aparte y no son críticas para el reporte; si fallan, seguimos.
    try { await guardarFotos(); } catch (_) { /* faltan reglas de Firestore para "menuFotos"; el texto y el PDF continúan */ }
    setStatus('guardado');
    // 2) Generar el PDF, subirlo a Drive y registrarlo en "Planes".
    const url = process.env.REACT_APP_APPSCRIPT_URL;
    if (!url) { setRep('Menús guardados ✓ (no se generó PDF: falta REACT_APP_APPSCRIPT_URL).'); return; }
    try {
      // Lista del súper: SOLO si se incluyen menús (en "Equivalencias" no se ejecuta la IA, para no gastar créditos).
      let listasReporte = null;
      let listaReason = '';
      if (incluirMenus) {
        if (Array.isArray(listas) && listas.length) {
          listasReporte = listas; // ya generada antes; se reutiliza sin volver a llamar a la IA
        } else if (!construirOpcionesLista().length) {
          listaReason = 'no había platillos en los menús';
        } else {
          try {
            setRep('Generando la lista del súper con IA…');
            listasReporte = await pedirListasIA();
            setListas(listasReporte);
          } catch (e) { listasReporte = null; listaReason = e.message; /* el reporte se genera igual, sin lista */ }
        }
      }
      setRep('Generando y subiendo el PDF a Drive…');
      // Incrusta (base64) las fotos de cada opción para que aparezcan en el PDF.
      let fotoData = {};
      try {
        const keysFotos = tiempos.flatMap(t => (t.opciones || []).map(o => o.fotoKey)).filter(Boolean);
        fotoData = await fotosDataMap(keysFotos);
      } catch (_) { fotoData = {}; }
      const html = buildReportHTML({ nombre: patient.nombre, objetivo: patient.objetivo, plan: patient.plan, tiempos, incluirMenus, incluirEquivalencias, listas: listasReporte, fotoData });
      const fechaTxt = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
      const baseNombre = 'Plan nutricional ' + String(patient.nombre || 'paciente').trim() + ' ' + fechaTxt;
      const filename = baseNombre + '.pdf';
      const res = await fetchIA(url, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'savePlan', patient: patient.nombre, correo: (patient.correo || ''), filename, html }), redirect: 'follow',
      }, 180000);
      let data; try { data = JSON.parse(await res.text()); } catch (_) { data = { ok: false, error: 'Respuesta no válida del servidor.' }; }
      if (data.ok && data.link) {
        const nuevo = { nombre: baseNombre, fecha: new Date().toISOString().slice(0, 10), link: data.link };
        const archivosNuevos = [nuevo];
        // Documento adicional: SOLO la tabla de equivalencias, visible para nutrióloga y paciente
        // en "Mis archivos". Reusa 'savePlan' con enviarCorreo:false → no manda correo ni reprograma seguimiento.
        const hayEq = tiempos.some(t => (t.eq || []).some(v => num(v) > 0));
        if (hayEq) {
          try {
            setRep('Generando la tabla de equivalencias…');
            const htmlEq = buildReportHTML({ nombre: patient.nombre, objetivo: patient.objetivo, plan: patient.plan, tiempos, incluirMenus: false, incluirEquivalencias: true, listas: null, fotoData: {} });
            const baseEq = 'Tabla de equivalencias ' + String(patient.nombre || 'paciente').trim() + ' ' + fechaTxt;
            const resEq = await fetchIA(url, {
              method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'savePlan', patient: patient.nombre, correo: (patient.correo || ''), filename: baseEq + '.pdf', html: htmlEq, enviarCorreo: false }), redirect: 'follow',
            }, 180000);
            let dEq; try { dEq = JSON.parse(await resEq.text()); } catch (_) { dEq = { ok: false }; }
            if (dEq.ok && dEq.link) archivosNuevos.push({ nombre: baseEq, fecha: new Date().toISOString().slice(0, 10), link: dEq.link });
          } catch (e) { /* la tabla de equivalencias es adicional; no bloquea el guardado del plan */ }
        }
        await updateDoc(doc(db, 'pacientes', patient.id), { planes: [...(patient.planes || []), ...archivosNuevos] });
        // Archiva este menú (contenido editable + PDF) en el historial para poder reabrirlo después.
        try {
          const tiemposSnap = tiempos.map(t => ({ ...t, foto: '' })); // las imágenes viven en 'menuFotos', no en el historial
          const snap = { fecha: new Date().toISOString().slice(0, 10), nombre: baseNombre, link: data.link, tiempos: tiemposSnap, nOpciones };
          const hist = [...(patient.menusHistorial || []), snap].slice(-24);
          await updateDoc(doc(db, 'pacientes', patient.id), { menusHistorial: hist });
        } catch (e) { /* el historial es secundario; no debe bloquear el guardado */ }
        const faltoLista = incluirMenus && (!listasReporte || !listasReporte.length);
        setRep('Menús guardados; reporte y tabla de equivalencias en "Mis archivos" ✓' + (faltoLista ? (' — nota: no se incluyó la lista del súper (' + (listaReason || 'motivo desconocido') + ').') : ''));
      } else {
        setRep('Menús guardados ✓, pero el PDF no se pudo subir: ' + (data.error || 'no se recibió enlace.'));
      }
    } catch (e) {
      setRep('Menús guardados ✓, pero falló el PDF: ' + e.message);
    }
  };

  // balance: suma por grupo de todos los tiempos vs total del plan (con decimales)
  const sumaPorGrupo = (g) => round2(tiempos.reduce((a, t) => a + num(t.eq[g]), 0));
  const cuadra = planEq ? usados.every(g => Math.abs(sumaPorGrupo(g) - num(planEq[g])) < 0.01) : false;

  const S = styles;
  // Mostrar la ventana de carga mientras la IA trabaja o se guarda el plan (incluida la tabla de equivalencias).
  const cargando = iaBusy || listaBusy || status === 'guardando';
  const cargaTexto = (rep && rep.trim()) ? rep : 'Trabajando…';
  // Cronómetro + mensajes escalonados: mientras trabaja, cuenta los segundos y va
  // cambiando el texto para que se vea que sigue activo (y no colgado).
  useEffect(() => {
    if (!cargando) { setCargaSeg(0); return undefined; }
    setCargaSeg(0);
    const t = setInterval(() => setCargaSeg(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [cargando]);
  const cargaFase =
    cargaSeg < 12 ? 'Esto puede tardar unos segundos.'
    : cargaSeg < 35 ? 'Seguimos trabajando… la IA está armando la información.'
    : cargaSeg < 75 ? 'Aún en proceso, no cierres ni recargues la ventana.'
    : 'Casi listo, gracias por tu paciencia…';

  if (!planEq || usados.length === 0) {
    return (
      <div style={S.root}>
        <style>{css}</style>
        <button style={S.back} onClick={() => requestExit(onBack)}>← {patient.nombre}</button>
        <div style={S.empty}>
          Primero <b>calcula y guarda el plan</b> (sección "Plan nutricional"). Los menús se arman a partir de los equivalentes del plan.
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <style>{css}</style>

      {cargando && (
        <div style={S.cargaOverlay}>
          <div style={S.cargaCard}>
            <div style={S.cargaSpin} />
            <div style={S.cargaMsg}>{cargaTexto}</div>
            <div style={S.cargaBarTrack}><div style={S.cargaBarFill} /></div>
            <div style={S.cargaSub}>{cargaFase} No cierres ni recargues la ventana.</div>
            <div style={S.cargaTimer}>Tiempo transcurrido: {mmss(cargaSeg)}</div>
          </div>
        </div>
      )}

      {showCfg && (
        <div style={S.modalWrap}>
          <div style={S.modalCard}>
            <div style={S.eyebrow}>Configurar menús</div>
            <h2 style={S.balTitle}>¿Qué menús vamos a armar?</h2>
            <div style={S.cfgRow}>
              <span style={S.cfgLbl}>Opciones de menú por tiempo</span>
              <div style={S.stepper}>
                <button style={S.stepBtn} onClick={() => setCfgNOp(n => Math.max(1, n - 1))}>−</button>
                <span style={S.stepVal}>{cfgNOp}</span>
                <button style={S.stepBtn} onClick={() => setCfgNOp(n => Math.min(6, n + 1))}>+</button>
              </div>
            </div>
            <div style={S.cfgRow}>
              <span style={S.cfgLbl}>Tiempos de comida</span>
              <div style={S.stepper}>
                <button style={S.stepBtn} onClick={() => cfgSetN(cfgTiempos.length - 1)}>−</button>
                <span style={S.stepVal}>{cfgTiempos.length}</span>
                <button style={S.stepBtn} onClick={() => cfgSetN(cfgTiempos.length + 1)}>+</button>
              </div>
            </div>
            <div style={S.cfgListLbl}>Nombre y horario de cada tiempo (editables)</div>
            <div style={S.cfgList}>
              {cfgTiempos.map((t, i) => (
                <div key={i}
                  style={{ ...S.cfgItem, ...(cfgOverIdx === i && cfgDragIdx !== null && cfgDragIdx !== i ? S.cfgItemOver : null) }}
                  onDragOver={e => { e.preventDefault(); if (cfgOverIdx !== i) setCfgOverIdx(i); }}
                  onDrop={e => { e.preventDefault(); cfgReordenar(cfgDragIdx, i); setCfgDragIdx(null); setCfgOverIdx(null); }}>
                  <span style={S.cfgHandle} title="Arrastra para reordenar" draggable
                    onDragStart={() => setCfgDragIdx(i)} onDragEnd={() => { setCfgDragIdx(null); setCfgOverIdx(null); }}>
                    <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">
                      {[[3, 3], [9, 3], [3, 9], [9, 9], [3, 15], [9, 15]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="1.5" fill="currentColor" />)}
                    </svg>
                  </span>
                  <input style={S.cfgName} value={t.nombre} onChange={e => cfgSetTiempo(i, { nombre: e.target.value })} />
                  <input style={S.cfgHora} value={t.hora} onChange={e => cfgSetTiempo(i, { hora: e.target.value })} />
                  <button style={{ ...S.cfgArrow, ...(i === 0 ? S.cfgArrowOff : null) }} disabled={i === 0} title="Subir" onClick={() => cfgMover(i, -1)}>↑</button>
                  <button style={{ ...S.cfgArrow, ...(i === cfgTiempos.length - 1 ? S.cfgArrowOff : null) }} disabled={i === cfgTiempos.length - 1} title="Bajar" onClick={() => cfgMover(i, 1)}>↓</button>
                </div>
              ))}
            </div>
            {savedMenus && <div style={S.cfgWarn}>Reconfigurar regenera la estructura: las opciones de menú que ya tengas escritas se reemplazan por tarjetas vacías.</div>}
            <div style={S.cfgActions}>
              {savedMenus && <button style={S.volverBtn} onClick={() => setShowCfg(false)}>Cancelar</button>}
              <button style={S.primaryBtn} className="nf-primary" onClick={aplicarConfig}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {showScope && (
        <div style={S.modalWrap}>
          <div style={{ ...S.modalCard, maxWidth: 430 }}>
            <div style={S.eyebrow}>Guardar plan</div>
            <h2 style={{ ...S.balTitle, marginBottom: 4 }}>¿Deseas imprimir menús y equivalencias en el mismo plan?</h2>
            <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 16 }}>Elige qué hojas incluir en el reporte del plan.</div>

            <button
              style={{ width: '100%', textAlign: 'left', background: T.amber, color: '#211C17', border: 'none', borderRadius: 10, padding: '13px 14px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: mono, marginBottom: 10 }}
              onClick={() => guardarConAlcance('menus')}
            >Menús
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.92, marginTop: 2 }}>Todo el reporte SIN las hojas de equivalencias · incluye la lista del súper</div>
            </button>

            <button
              style={{ width: '100%', textAlign: 'left', background: '#fff', color: '#211C17', border: `1.5px solid ${T.amber}`, borderRadius: 10, padding: '13px 14px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: mono, marginBottom: 10 }}
              onClick={() => guardarConAlcance('equivalencias')}
            >Equivalencias
              <div style={{ fontSize: 11, fontWeight: 400, color: T.inkSoft, marginTop: 2 }}>Todo el reporte SIN las hojas de menús · sin lista del súper</div>
            </button>

            <button
              style={{ width: '100%', textAlign: 'left', background: T.pine, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 14px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: mono, marginBottom: 14 }}
              onClick={() => guardarConAlcance('ambos')}
            >Ambos
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>Todo el plan como está configurado · incluye la lista del súper</div>
            </button>

            <div style={S.cfgActions}>
              <button style={S.volverBtn} onClick={() => setShowScope(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showSeg && (
        <div style={S.modalWrap}>
          <div style={{ ...S.modalCard, maxWidth: 480 }}>
            <div style={S.eyebrow}>Seguimiento</div>
            <h2 style={S.balTitle}>Aplicar cambios de seguimiento</h2>
            <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 6 }}>Se toma la última nota de seguimiento y la IA aplica solo los cambios de alimento que pidas. <b>No se modifican equivalencias ni gramajes.</b> Puedes editar el texto antes de aplicar.</div>
            <div style={{ fontSize: 11, color: T.inkSoft, margin: '10px 0 4px' }}>
              {ultimaNota
                ? `Última nota${ultimaNota.fecha ? ' · ' + new Date(ultimaNota.fecha).toLocaleDateString('es-MX') : ''}`
                : 'No hay notas de seguimiento; escribe el cambio a aplicar.'}
            </div>
            <textarea
              style={{ width: '100%', minHeight: 120, padding: '10px 12px', border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 13, lineHeight: 1.6, color: T.ink, resize: 'vertical', boxSizing: 'border-box', fontFamily: mono }}
              placeholder="Ej.: cambiar el pollo por pescado en la comida y quitar la avena del desayuno. Todo lo demás igual."
              value={segNota}
              onChange={e => setSegNota(e.target.value)}
            />
            {segBusy && <div style={S.listaMsg}>Aplicando cambios con IA…</div>}
            <div style={S.cfgActions}>
              <button style={S.volverBtn} onClick={() => setShowSeg(false)} disabled={segBusy}>Cancelar</button>
              <button style={{ ...S.toolBtn, ...S.iaBtn }} onClick={aplicarCambiosSeg} disabled={segBusy}>{segBusy ? 'Aplicando…' : 'Aplicar cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {showLista && (
        <div style={S.modalWrap}>
          <div style={S.modalCard}>
            <div style={S.eyebrow}>Lista del súper</div>
            <h2 style={S.balTitle}>Insumos para 5 días, por opción</h2>
            {listaBusy && <div style={S.listaMsg}>Leyendo los menús y armando la lista con IA…</div>}
            {listaErr && <div style={S.cfgWarn}>{listaErr}</div>}
            {!listaBusy && !listaErr && listas && listas.map(L => (
              <div key={L.opcion} style={S.listaBlock}>
                <div style={S.listaHead}>
                  <span>Opción {L.opcion}</span>
                  <button style={S.optIaBtn} onClick={() => copiarLista(L)}>Copiar</button>
                </div>
                {(L.categorias || []).map((c, ci) => (
                  <div key={ci} style={S.listaCat}>
                    <div style={S.listaCatName}>{c.nombre}</div>
                    <ul style={S.listaUl}>
                      {(c.items || []).map((it, ii) => (
                        <li key={ii} style={S.listaLi}>{it.insumo}{it.cantidad ? ' — ' + it.cantidad : ''}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
            <div style={S.cfgActions}>
              <button style={S.volverBtn} onClick={() => setShowLista(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <button style={S.back} onClick={() => requestExit(onBack)}>← {patient.nombre}</button>
      <div style={S.titleRow}>
        <div style={{ flex: 1 }}>
          <div style={S.eyebrow}>Plan nutricional</div>
          <h1 style={S.h1}>Menús por tiempo de comida</h1>
        </div>
      </div>

      <div style={S.toolbar}>
        {patient.historia && (
          <button style={S.toolBtn} onClick={() => setVerHistoria(true)} title="Consultar la historia clínica sin salir">Ver historia clínica</button>
        )}
        <button style={S.toolBtn} onClick={() => setVerNotas(true)} title="Consultar las notas de seguimiento sin salir">Ver notas de seguimiento</button>
        <button style={S.toolBtn} onClick={() => setShowCfg(true)}>Reconfigurar</button>
        <button style={S.toolBtn} onClick={redistribuir}>Redistribuir equivalentes</button>
        <button style={{ ...S.toolBtn, ...S.iaBtn }} onClick={generarIA} disabled={iaBusy}>{iaBusy ? 'Generando…' : 'Generar todos con IA ✦'}</button>
        <button style={S.toolBtn} onClick={generarListaSuper} disabled={listaBusy}>{listaBusy ? 'Generando…' : 'Lista del súper'}</button>
        <button style={S.toolBtn} onClick={() => { setSegNota(ultimaNota ? (ultimaNota.texto || '') : ''); setShowSeg(true); }} disabled={iaBusy || segBusy}>Aplicar cambios de seguimiento ✦</button>
      </div>
      <div style={S.iaNote}>Puedes generar todos los menús de golpe, o regenerar <b>una sola opción</b> con el botón <b>IA ✦</b> de cada tarjeta — así arreglas las que no sirven sin tocar las que ya quedaron bien. La IA solo sugiere: <b>revisa y edita</b> antes de guardar.</div>

      <div style={{ margin: '12px 0 4px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pine)', marginBottom: 5 }}>
          Consideraciones generales para la IA <span style={{ fontWeight: 500, color: 'var(--stone)' }}>(opcional · aplican a todo el plan)</span>
        </div>
        <textarea
          value={consideracionGral}
          onChange={e => setConsideracionGral(e.target.value)}
          placeholder="Ej.: dieta baja en FODMAPs en todo el plan · evitar lácteos y fritura · preparaciones económicas y fáciles · máximo 20 min de cocción…"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)', background: '#fff', resize: 'vertical' }}
        />
        <div style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 4 }}>Se toma en cuenta al <b>generar todos con IA</b> y al <b>regenerar una opción</b>, además de las indicaciones de cada tiempo.</div>
      </div>

      {verNotas && (
        <NotasSeguimiento notas={patient.bitacora} nombre={patient.nombre} onClose={() => setVerNotas(false)} closeBtnStyle={S.toolBtn} />
      )}

      {verHistoria && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setVerHistoria(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
          <div style={{ position: 'relative', width: 'min(640px, 94vw)', height: '100%', background: 'var(--bg)', boxShadow: '-10px 0 30px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--card)' }}>
              <span style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>Historia clínica · {patient.nombre || ''} <span style={{ fontWeight: 400, color: 'var(--stone)', fontSize: 12 }}>(solo lectura)</span></span>
              <button style={S.toolBtn} onClick={() => setVerHistoria(false)}>Cerrar ✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <HistoriaClinica initial={patient.historia} codigo={patient.codigo} readOnly onBack={() => setVerHistoria(false)} />
            </div>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={S.eyebrow}>Balance por grupo</div>
            <h2 style={S.balTitle}>Distribución del plan vs. menús</h2>
          </div>
          <span style={{ ...S.balance, ...(cuadra ? S.balOk : S.balBad) }}>{cuadra ? 'Equivalentes cuadran ✓' : 'Revisar reparto'}</span>
        </div>

        <div style={S.balSub}>Equivalencias por tiempo · editable</div>
        <div style={S.balWrap}>
          <table style={{ ...S.balTable, minWidth: 600 }} data-gridnav>
            <thead>
              <tr>
                <th style={{ ...S.balTh, textAlign: 'left' }}>Grupo</th>
                {tiempos.map((t, idx) => <th key={t.id || idx} style={S.balTh}>{t.nombre}</th>)}
                <th style={{ ...S.balTh, color: T.amber }}>Plan</th>
                <th style={S.balTh}>Total</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((_, g) => g).filter(g => (planEq && num(planEq[g]) > 0) || sumaPorGrupo(g) > 0).map((g, rowIdx) => {
                const okG = planEq ? Math.abs(sumaPorGrupo(g) - num(planEq[g])) < 0.01 : null;
                return (
                <tr key={'eqm' + g} style={okG === null ? undefined : (okG ? S.balRowOk : S.balRowBad)}>
                  <td style={{ ...S.balTd, textAlign: 'left', fontWeight: 700 }}>{GSHORT[g]}</td>
                  {tiempos.map((t, idx) => (
                    <td key={idx} style={S.balTd}>
                      <input style={S.eqInput} inputMode="decimal" placeholder="—"
                        data-row={rowIdx} data-col={idx} onKeyDown={gridKeyDown}
                        value={(t.eq[g] === '' || t.eq[g] === 0 || t.eq[g] === '0') ? '' : t.eq[g]}
                        onChange={e => setEqCell(idx, g, e.target.value)} />
                    </td>
                  ))}
                  <td style={{ ...S.balTd, fontWeight: 700, color: T.amber }}>{fmt(num(planEq ? planEq[g] : 0))}</td>
                  <td style={{ ...S.balTd, fontWeight: 700 }}>{fmt(sumaPorGrupo(g))}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={S.balHint}>El Total suma lo repartido en todos los tiempos; debe coincidir con el plan del paciente.</div>
      </div>

      {tiempos.map((t, idx) => {
        const en = t.eq.reduce((a, _, g) => ({
          kcal: a.kcal + num(t.eq[g]) * GRUPOS[g][1], prot: a.prot + num(t.eq[g]) * GRUPOS[g][2],
          lip: a.lip + num(t.eq[g]) * GRUPOS[g][3], hc: a.hc + num(t.eq[g]) * GRUPOS[g][4],
        }), { kcal: 0, prot: 0, lip: 0, hc: 0 });
        return (
          <div key={t.id} style={S.card}>
            <div style={S.mealHead}>
              <input style={S.mealName} value={t.nombre} onChange={e => setT(idx, { nombre: e.target.value })} />
              <input style={S.mealHora} value={t.hora} onChange={e => setT(idx, { hora: e.target.value })} />
              <div style={S.mealKcal}>{r0(en.kcal)} kcal · {r0(en.prot)}P {r0(en.lip)}L {r0(en.hc)}HC</div>
              {tiempos.length > 1 && <button style={S.del} onClick={() => delTiempo(idx)} title="Quitar tiempo">×</button>}
            </div>

            <div style={S.eqLabel}>Equivalentes de este tiempo</div>
            <div style={S.eqGrid}>
              {usados.map(g => (
                <label key={g} style={S.eqItem}>
                  <span style={S.eqName}>{GSHORT[g]}</span>
                  <input style={S.eqInput} inputMode="decimal" value={t.eq[g]} onChange={e => setEqCell(idx, g, e.target.value)} />
                </label>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 12px', fontSize: 13, fontWeight: 700, color: T.pine, cursor: 'pointer' }}>
              <input type="checkbox" checked={esPorciones(t)} onChange={e => setPorciones(idx, e.target.checked)} />
              Porciones (equivalencias) — una sola opción, sin IA
            </label>

            {!esPorciones(t) && (
              <div style={{ border: `1px solid #C2A24E`, borderRadius: 10, padding: '11px 13px', background: 'rgba(194,162,78,0.06)', margin: '0 0 14px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#9A7B2E', marginBottom: 7 }}>✦ Indicaciones para la IA (opcional)</div>
                <textarea
                  style={{ width: '100%', minHeight: 54, padding: '9px 11px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 13, lineHeight: 1.5, fontFamily: mono, color: T.ink, resize: 'vertical', boxSizing: 'border-box' }}
                  placeholder="Ej.: Cena ligera, proteína magra + verdura, sin cereales ni frituras."
                  value={t.indicacion || ''}
                  onChange={e => setT(idx, { indicacion: e.target.value })}
                />
                <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>Guía a la IA para este tiempo. Si la dejas vacía, decide por el nombre y la hora.</div>
              </div>
            )}

            <div style={S.optsRow}>
              <div style={{ flex: 1 }}>
                {esPorciones(t) ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <span style={S.optTag}>Porciones generales para armar la comida</span>
                      <button style={S.optIaBtn} onClick={() => regenerarPorciones(idx)}>Regenerar desde equivalentes</button>
                    </div>
                    <textarea
                      style={{ width: '100%', minHeight: 130, padding: '10px 12px', border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 13, lineHeight: 1.6, fontFamily: mono, color: T.ink, resize: 'vertical', boxSizing: 'border-box' }}
                      placeholder="Ejemplo por grupo (se genera desde los equivalentes; edítalo libremente)"
                      value={t.porcionesTexto != null ? t.porcionesTexto : generarPorcionesTexto(t.eq)}
                      onChange={e => setPorcionesTexto(idx, e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>Una línea por grupo. Las raciones salen de los equivalentes de arriba y el gramaje de la tabla de equivalentes. Se separan las opciones con " ó " (sin coma).</div>
                  </div>
                ) : t.opciones.map((o, oi) => (
                  <div key={oi} style={S.opt}>
                    <div style={S.optHead}>
                      <span style={S.optTag}>Opción {oi + 1}</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button style={S.optIaBtn}
                          onClick={() => ajustarGramajesOpcion(idx, oi)}
                          disabled={iaBusy || ajuBusy === (idx + ':' + oi) || opBusy === (idx + ':' + oi)}
                          title="Reescribe los gramajes de esta preparación para que cuadren con las equivalencias de este tiempo (mismo platillo, mismos alimentos)">
                          {ajuBusy === (idx + ':' + oi) ? 'Ajustando…' : 'Ajustar gramajes ✦'}
                        </button>
                        <button style={S.optIaBtn}
                          onClick={() => generarOpcionIA(idx, oi)}
                          disabled={iaBusy || opBusy === (idx + ':' + oi) || ajuBusy === (idx + ':' + oi)}>
                          {opBusy === (idx + ':' + oi) ? 'Generando…' : 'IA ✦'}
                        </button>
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input style={S.optName} placeholder="Nombre del platillo" value={o.nombre}
                        onChange={e => setOpcionNombre(idx, oi, e.target.value)}
                        onFocus={() => setSugerFoto({ idx, oi })}
                        onBlur={() => setTimeout(() => { setSugerFoto(s => (s && s.idx === idx && s.oi === oi) ? null : s); autocargarRecetaSiVacia(idx, oi); }, 150)} />
                      {(() => {
                        const enfocado = sugerFoto && sugerFoto.idx === idx && sugerFoto.oi === oi;
                        const avisando = avisoReceta && avisoReceta.idx === idx && avisoReceta.oi === oi;
                        if ((!enfocado && !avisando) || (o.nombre || '').trim().length < 2) return null;
                        const sug = buscarFotos(o.nombre, 6);
                        if (!sug.length) return null;
                        return (
                          <div style={S.sugBox}>
                            <div style={avisando && !enfocado ? { ...S.sugHint, color: '#B45309', fontWeight: 600 } : S.sugHint}>
                              {avisando && !enfocado
                                ? 'No encontré ese platillo en tu recetario — elige uno de la lista para cargar su receta:'
                                : 'Platillos del banco — toca uno para cargar foto, nombre y receta'}
                            </div>
                            {sug.map(f => (
                              <button key={f.file} type="button" style={S.sugItem}
                                onMouseDown={e => { e.preventDefault(); elegirPlatilloSugerido(idx, oi, f); }}>
                                <img src={fotoUrl(f.file)} alt="" style={S.sugImg} />
                                <span style={S.sugLabel}>{f.label}</span>
                                {f.receta ? <span style={S.sugTag}>receta</span> : null}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <textarea style={S.optPrep} rows={2} placeholder="Preparación y gramajes" value={o.prep} onChange={e => setOpcion(idx, oi, { prep: e.target.value })} />
                    <div style={S.optFotoRow}>
                      {o.fotoKey
                        ? <img src={fotoUrl(o.fotoKey)} alt="" style={S.optFotoThumb} />
                        : <div style={S.optFotoThumbEmpty}>Sin foto</div>}
                      <div style={S.optFotoBtns}>
                        <button style={S.optFotoBtn} onClick={() => { setFotoQuery(o.nombre || ''); setFotoPage(0); setFotoPicker({ idx, oi }); }}>
                          {o.fotoKey ? 'Cambiar foto' : 'Elegir foto'}
                        </button>
                        <button style={S.optFotoBtn} onClick={() => { setFotoQuery(''); setFotoPage(0); setFotoPicker({ idx, oi }); }}>Subir foto</button>
                        {o.fotoKey && <button style={S.optFotoClear} onClick={() => setOpcionFoto(idx, oi, '')}>Quitar</button>}
                        {o.fotoKey && o.fotoAuto !== false && <span style={S.optFotoAuto}>automática</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <button style={S.addBtn} onClick={addTiempo}>+ Agregar tiempo de comida</button>

      <div style={S.actions}>
        <div style={S.footerInfo}>
          {rep || (status === 'guardado' && 'Menús guardados.') || (status === 'guardando' && 'Guardando…') || (status === 'error' && 'No se pudo guardar.') || (status === 'nuevo' && 'Cambios sin guardar.')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={S.volverBtn} onClick={() => requestExit(onBack)}>← Atrás</button>
          <button style={S.draftBtn} onClick={guardarBorrador} disabled={status === 'guardando'}>Guardar borrador</button>
          <button style={S.primaryBtn} className="nf-primary" onClick={() => setShowScope(true)} disabled={status === 'guardando'}>{status === 'guardando' ? 'Guardando…' : 'Guardar menús'}</button>
        </div>
      </div>

      {showBorradorModal && (
        <div style={S.modalWrap}>
          <div style={{ ...S.modalCard, maxWidth: 440 }}>
            <div style={S.exitTitle}>Tienes un borrador guardado</div>
            <div style={S.exitText}>Cambiaste la distribución de equivalentes en el plan desde que guardaste este menú. ¿Quieres continuar con tu borrador o empezar de nuevo con el plan actual?</div>
            <div style={S.exitBtns}>
              <button style={S.volverBtn} onClick={empezarDesdeCero}>Empezar desde cero</button>
              <button style={S.primaryBtn} className="nf-primary" onClick={() => setShowBorradorModal(false)}>Continuar con el borrador</button>
            </div>
          </div>
        </div>
      )}

      {exitModal && (
        <div style={S.modalWrap}>
          <div style={{ ...S.modalCard, maxWidth: 420 }}>
            <div style={S.exitTitle}>¿Quieres salir?</div>
            <div style={S.exitText}>No has guardado tu trabajo.</div>
            <div style={S.exitBtns}>
              <button style={S.volverBtn} onClick={salirAhora}>Salir</button>
              <button style={S.primaryBtn} className="nf-primary" onClick={guardarYSalir} disabled={status === 'guardando'}>
                {status === 'guardando' ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {fotoPicker && (() => {
        const _opt = (tiempos[fotoPicker.idx] && tiempos[fotoPicker.idx].opciones[fotoPicker.oi]) || {};
        const _nombre = (_opt.nombre || '').trim();
        return (
        <div style={S.modalWrap} onClick={() => setFotoPicker(null)}>
          <div style={{ ...S.modalCard, maxWidth: 640, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={S.balTitle}>Elegir o subir foto del platillo</div>
            <div
              onDragOver={e => { e.preventDefault(); setDragBanco(true); }}
              onDragLeave={() => setDragBanco(false)}
              onDrop={e => onDropBanco(fotoPicker.idx, fotoPicker.oi, e)}
              style={{ border: '1.5px dashed var(--gold)', borderRadius: 12, padding: '14px', textAlign: 'center', background: dragBanco ? 'rgba(205,167,136,0.16)' : 'var(--cream)', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>¿No está en el banco? Arrastra o sube una foto aquí</div>
              <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 8, lineHeight: 1.4 }}>
                {_nombre
                  ? <>Se guardará en la biblioteca como <b>“{_nombre}”</b> y se usará para este platillo (y para los que se llamen igual).</>
                  : 'Primero escribe el nombre del platillo para poder subir la foto.'}
              </div>
              <label style={{ ...S.optFotoBtn, display: 'inline-block', cursor: _nombre && !subiendoBanco ? 'pointer' : 'not-allowed', opacity: _nombre && !subiendoBanco ? 1 : 0.5, pointerEvents: _nombre && !subiendoBanco ? 'auto' : 'none' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onSubirBanco(fotoPicker.idx, fotoPicker.oi, e)} />
                {subiendoBanco ? 'Subiendo…' : 'Subir foto'}
              </label>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 6 }}>O elige del banco</div>
            <input autoFocus style={{ ...S.optName, marginBottom: 10 }} placeholder="Buscar… ej. chilaquiles, salmón, avena" value={fotoQuery} onChange={e => { setFotoQuery(e.target.value); setFotoPage(0); }} />
            {(() => {
              const FP_POR_PAGINA = 12;
              const _todas = buscarFotos(fotoQuery, 500);
              const _totalPag = Math.max(1, Math.ceil(_todas.length / FP_POR_PAGINA));
              const _pag = Math.min(fotoPage, _totalPag - 1);
              const _visibles = _todas.slice(_pag * FP_POR_PAGINA, _pag * FP_POR_PAGINA + FP_POR_PAGINA);
              return (
                <>
                  <div style={S.fpGrid}>
                    {_visibles.length === 0
                      ? <div style={S.fpEmpty}>No hay fotos que coincidan con la búsqueda.</div>
                      : _visibles.map(f => (
                        <button key={f.file} style={S.fpItem} onClick={() => { setOpcionFoto(fotoPicker.idx, fotoPicker.oi, f.file); setFotoPicker(null); }}>
                          <img src={fotoUrl(f.file)} alt="" style={S.fpImg} />
                          <span style={S.fpLabel}>{f.label}</span>
                        </button>
                      ))}
                  </div>
                  <div style={S.fpFoot}>
                    {_todas.length > FP_POR_PAGINA
                      ? <div style={S.fpPager}>
                          <button style={{ ...S.fpPageBtn, ...(_pag === 0 ? S.fpPageBtnOff : null) }} onClick={() => setFotoPage(p => Math.max(0, p - 1))} disabled={_pag === 0}>‹</button>
                          <span>Página {_pag + 1} de {_totalPag}</span>
                          <button style={{ ...S.fpPageBtn, ...(_pag >= _totalPag - 1 ? S.fpPageBtnOff : null) }} onClick={() => setFotoPage(p => Math.min(_totalPag - 1, p + 1))} disabled={_pag >= _totalPag - 1}>›</button>
                        </div>
                      : <span />}
                    <button style={S.volverBtn} onClick={() => setFotoPicker(null)}>Cerrar</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

const styles = {
  root: { fontFamily: mono, color: T.ink },
  // Ventana de carga (overlay) mientras la IA genera o se guarda el plan.
  cargaOverlay: { position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,32,46,0.45)' },
  cargaCard: { background: 'var(--card)', borderRadius: 16, padding: '30px 34px', width: 'min(340px, 88vw)', textAlign: 'center', boxShadow: '0 18px 50px rgba(20,40,63,0.30)', fontFamily: mono },
  cargaSpin: { width: 42, height: 42, margin: '0 auto 16px', borderRadius: '50%', border: '4px solid var(--line)', borderTopColor: 'var(--gold)', animation: 'nfspin 0.8s linear infinite' },
  cargaMsg: { fontSize: 14, fontWeight: 700, color: 'var(--pine)', lineHeight: 1.5 },
  cargaBarTrack: { position: 'relative', width: '100%', height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', margin: '14px 0 10px' },
  cargaBarFill: { position: 'absolute', top: 0, bottom: 0, width: '40%', borderRadius: 999, background: 'var(--gold)', animation: 'nfbar 1.15s ease-in-out infinite' },
  cargaSub: { fontSize: 12, color: 'var(--stone)', marginTop: 8, lineHeight: 1.5 },
  cargaTimer: { fontSize: 11, color: 'var(--stone)', marginTop: 6, fontWeight: 600 },
  // Foto por opción
  optFotoRow: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 },
  optFotoThumb: { width: 120, height: 120, borderRadius: 12, objectFit: 'cover', border: '2px solid ' + T.amber, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' },
  optFotoThumbEmpty: { width: 120, height: 120, borderRadius: 12, border: '1px dashed ' + T.line, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: T.inkSoft, flexShrink: 0, textAlign: 'center' },
  optFotoBtns: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  optFotoBtn: { background: T.mint, border: '1px solid ' + T.line, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: T.ink, cursor: 'pointer', fontFamily: mono },
  optFotoClear: { background: 'transparent', border: 'none', color: T.danger, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: mono },
  optFotoAuto: { fontSize: 9.5, color: T.sage, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' },
  fpGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, overflowY: 'auto', padding: 2 },
  fpItem: { position: 'relative', aspectRatio: '1 / 1', border: '1px solid ' + T.line, borderRadius: 12, overflow: 'hidden', background: '#fff', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: mono },
  fpImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  fpLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', padding: '14px 7px 5px', lineHeight: 1.2 },
  fpFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10, flexWrap: 'wrap' },
  fpPager: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: T.inkSoft, fontWeight: 700 },
  fpPageBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid ' + T.line, background: '#fff', cursor: 'pointer', fontSize: 15, color: T.ink, fontFamily: mono },
  fpPageBtnOff: { opacity: 0.4, cursor: 'not-allowed' },
  fpEmpty: { gridColumn: '1 / -1', textAlign: 'center', color: T.inkSoft, fontSize: 12.5, padding: '24px 8px' },
  back: { background: 'transparent', border: 'none', color: T.inkSoft, fontFamily: mono, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 10 },
  titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: T.amber, marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: T.ink },
  balance: { fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' },
  balOk: { background: '#E9F1ED', color: '#3E6B5B' }, balBad: { background: '#F7EAE5', color: T.danger },
  balTitle: { margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: T.pine },
  balWrap: { overflowX: 'auto' },
  balTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  balTh: { textAlign: 'right', padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: T.inkSoft, borderBottom: `1px solid ${T.line}` },
  balTd: { textAlign: 'right', padding: '7px 10px', color: T.pine, borderBottom: `1px solid ${T.lineSoft || T.line}` },
  balRowBad: { background: '#FBF1EC' },
  balRowOk: { background: '#EDF4EF' },
  balSub: { fontSize: 12, fontWeight: 700, color: T.pine, margin: '2px 0 8px' },
  balHint: { marginTop: 10, fontSize: 11.5, color: T.inkSoft, lineHeight: 1.5 },
  modalWrap: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 },
  modalCard: { background: T.surface, borderRadius: 16, padding: '22px 22px 20px', width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 18px 50px rgba(0,0,0,0.3)' },
  exitTitle: { fontSize: 18, fontWeight: 800, color: T.pine, marginBottom: 8 },
  exitText: { fontSize: 14, color: T.ink, lineHeight: 1.5, marginBottom: 20 },
  exitBtns: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  cfgRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.lineSoft}` },
  cfgLbl: { fontSize: 13.5, fontWeight: 600, color: T.pine },
  stepper: { display: 'flex', alignItems: 'center', gap: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.line}`, background: '#fff', color: T.pine, fontSize: 18, fontWeight: 700, cursor: 'pointer', lineHeight: 1, fontFamily: mono },
  stepVal: { minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: 800, color: T.pine },
  cfgListLbl: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: T.inkSoft, margin: '14px 0 6px' },
  cfgList: { display: 'flex', flexDirection: 'column', gap: 7 },
  cfgItem: { display: 'flex', gap: 8, alignItems: 'center' },
  cfgItemOver: { outline: `2px dashed ${T.amber}`, outlineOffset: 2, borderRadius: 8 },
  cfgHandle: { display: 'flex', alignItems: 'center', cursor: 'grab', color: T.inkSoft, flexShrink: 0, padding: '0 1px' },
  cfgArrow: { width: 28, height: 28, flexShrink: 0, borderRadius: 7, border: `1px solid ${T.line}`, background: '#fff', color: T.pine, fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1, fontFamily: mono, padding: 0 },
  cfgArrowOff: { opacity: 0.35, cursor: 'default' },
  cfgName: { flex: 1, border: `1px solid ${T.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: T.pine, fontFamily: mono, background: '#FCFDFC', boxSizing: 'border-box' },
  cfgHora: { width: 78, border: `1px solid ${T.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, color: T.pine, fontFamily: mono, background: '#FCFDFC', boxSizing: 'border-box' },
  cfgWarn: { marginTop: 12, fontSize: 12, color: T.danger, background: '#F7EAE5', borderRadius: 9, padding: '9px 12px', lineHeight: 1.45 },
  cfgActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  listaMsg: { fontSize: 13, color: T.inkSoft, padding: '14px 0' },
  listaBlock: { border: `1px solid ${T.lineSoft}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 },
  listaHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: T.pine, marginBottom: 8 },
  listaCat: { marginBottom: 8 },
  listaCatName: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: T.amber, marginBottom: 3 },
  listaUl: { margin: 0, paddingLeft: 18 },
  listaLi: { fontSize: 13, color: T.ink, lineHeight: 1.5 },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  toolBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  iaBtn: { borderColor: T.amber, color: '#211C17', cursor: 'pointer', background: T.amber },
  iaNote: { fontSize: 12, color: T.inkSoft, background: T.mint, borderRadius: 9, padding: '9px 12px', marginBottom: 16, lineHeight: 1.5 },
  card: { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 },
  mealHead: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  mealName: { fontSize: 16, fontWeight: 800, color: T.pine, border: 'none', borderBottom: `1px solid ${T.line}`, padding: '2px 0', fontFamily: mono, background: 'transparent', flex: '1 1 140px', minWidth: 120 },
  mealHora: { width: 72, fontSize: 13, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 7, padding: '6px 8px', fontFamily: mono, background: '#FCFDFC' },
  mealKcal: { fontSize: 11.5, color: T.inkSoft, fontWeight: 600 },
  del: { background: 'transparent', border: 'none', color: T.inkSoft, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' },
  eqLabel: { fontSize: 10.5, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  eqGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 8, marginBottom: 16 },
  eqItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#FBF8F4', border: `1px solid ${T.lineSoft}`, borderRadius: 8, padding: '5px 6px 5px 10px' },
  eqName: { fontSize: 11.5, color: T.ink, fontWeight: 500 },
  eqInput: { width: 42, textAlign: 'center', border: `1px solid ${T.line}`, borderRadius: 6, padding: '5px 3px', fontSize: 13, fontWeight: 700, color: T.pine, background: '#fff', fontFamily: mono },
  optsRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  opt: { border: `1px solid ${T.lineSoft}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  optHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  optIaBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: mono, whiteSpace: 'nowrap' },
  optTag: { fontSize: 10, fontWeight: 800, color: T.amber, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  optName: { width: '100%', border: `1px solid ${T.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, fontWeight: 600, color: T.pine, fontFamily: mono, background: '#FCFDFC', marginBottom: 6, boxSizing: 'border-box' },
  // Desplegable de sugerencias de foto del banco (autocompletar por nombre).
  sugBox: { position: 'absolute', top: 'calc(100% - 2px)', left: 0, right: 0, zIndex: 40, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,0.16)', padding: 5, maxHeight: 272, overflowY: 'auto' },
  sugHint: { fontSize: 10.5, color: T.inkSoft, padding: '4px 6px 6px', lineHeight: 1.3 },
  sugItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'transparent', borderRadius: 8, padding: '5px 6px', cursor: 'pointer', textAlign: 'left', fontFamily: mono },
  sugImg: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${T.line}` },
  sugLabel: { flex: 1, fontSize: 12.5, fontWeight: 600, color: T.ink, lineHeight: 1.25 },
  sugTag: { flexShrink: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: T.pine, background: T.mint, borderRadius: 6, padding: '2px 6px' },
  optPrep: { width: '100%', border: `1px solid ${T.line}`, borderRadius: 7, padding: '8px 10px', fontSize: 12.5, color: T.ink, fontFamily: mono, background: '#FCFDFC', resize: 'vertical', boxSizing: 'border-box' },
  photoCol: { width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderRadius: 12, padding: 6, transition: 'background .15s' },
  photoColDrag: { background: T.mint, outline: `2px dashed ${T.amber}` },
  photoEmpty: { width: 130, height: 130, borderRadius: '50%', border: `2px dashed ${T.line}`, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 10, color: T.inkSoft, fontSize: 11, lineHeight: 1.35, boxSizing: 'border-box' },
  photoLabel: { fontSize: 10, fontWeight: 700, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, alignSelf: 'flex-start' },
  photo: { width: 130, height: 130, objectFit: 'cover', borderRadius: '50%', border: `2px solid ${T.amber}` },
  photoBtn: { background: T.amber, color: '#211C17', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  photoRm: { background: 'transparent', border: 'none', color: T.inkSoft, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' },
  addBtn: { width: '100%', background: '#fff', border: `1px dashed ${T.amber}`, color: T.pine, borderRadius: 11, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: mono, marginBottom: 16 },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '2px 2px 8px' },
  footerInfo: { fontSize: 12.5, color: T.inkSoft },
  primaryBtn: { background: T.amber, color: '#211C17', border: 'none', padding: '12px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 800, cursor: 'pointer', fontFamily: mono },
  reportBtn: { background: T.pine, color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  volverBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.pine}`, padding: '12px 18px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  draftBtn: { background: '#fff', color: T.pine, border: `1px solid ${T.amber}`, padding: '12px 18px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: mono },
  empty: { background: T.mint, border: `1px solid ${T.line}`, borderRadius: 12, padding: '18px', fontSize: 13.5, color: T.ink, lineHeight: 1.6 },
};

const css = `
@keyframes nfspin { to { transform: rotate(360deg); } }
@keyframes nfbar { 0% { left: -42%; } 100% { left: 100%; } }
.nf-primary:hover { background: #C0986F; }
input:focus, textarea:focus { outline: none; border-color: ${T.amber} !important; box-shadow: 0 0 0 3px rgba(205,167,136,0.25); }
`;
