import math
import unittest
import json
import tempfile
from pathlib import Path
from wilcoxon import analisar, executar, ler_entrada


class TestWilcoxon(unittest.TestCase):
    def test_literatura_wilcoxon_1945(self):
        # Exemplo de milho de Wilcoxon (1945), reproduzido na documentação SciPy.
        d = [6, 8, 14, 16, 23, 24, 28, 29, 41, -48, 49, 56, 60, -67, 75]
        r = analisar(d)
        self.assertEqual((r['wMais'], r['wMenos'], r['nEfetivo'], r['zerosDescartados']), (96, 24, 15, 0))
        self.assertEqual(r['pValor'], 0.041259765625)
        self.assertAlmostEqual(r['z'], 36 / math.sqrt(310))
        self.assertAlmostEqual(r['r'], 36 / math.sqrt(4650))

    def test_calculo_manual(self):
        # Postos 4,3,-1,2; W+=9,W-=1. Das 16 atribuições de sinal,
        # quatro são tão extremas: somas positivas 0,1,9,10. p=4/16.
        r = analisar([0.8, 0.6, -0.2, 0.4, 0])
        self.assertEqual((r['wMais'], r['wMenos'], r['nEfetivo'], r['zerosDescartados']), (9, 1, 4, 1))
        self.assertEqual(r['pValor'], 0.25)
        self.assertAlmostEqual(r['r'], 4 / math.sqrt(30))

    def test_empates(self):
        r = analisar([1, 1, -2, 0])
        self.assertEqual((r['wMais'], r['wMenos']), (3, 3))
        self.assertEqual(r['pValor'], 1)
        self.assertEqual(r['r'], 0)

    def test_todos_zeros(self):
        r = analisar([0, 0])
        self.assertEqual(r['zerosDescartados'], 2)
        self.assertIsNone(r['pValor'])
        self.assertIsNone(r['r'])

    def test_amostra_pequena_e_inversao(self):
        self.assertEqual(analisar([1])['pValor'], 1)
        self.assertEqual(analisar([1, 2, 3, 4])['pValor'], 0.125)
        r = analisar([1, 2, 3, 4, 5, 6])
        inverso = analisar([-1, -2, -3, -4, -5, -6])
        self.assertEqual(r['pValor'], 0.03125)
        self.assertEqual(r['pValor'], inverso['pValor'])
        self.assertEqual(r['r'], -inverso['r'])

    def test_empates_mesmo_sinal_e_precisao(self):
        self.assertEqual(analisar([1, 1, 1, 1, 1, 1])['pValor'], 0.03125)
        self.assertEqual(analisar([0.1 + 0.2 - 0.3])['nEfetivo'], 0)

    def test_entrada_invalida(self):
        for d in ([], [float('nan')], [float('inf')], [[1, 2]], list(range(1, 18))):
            with self.assertRaises(ValueError):
                analisar(d)

    def test_relatorios_e_validacao_de_pares(self):
        with tempfile.TemporaryDirectory() as pasta:
            entrada = Path(pasta) / 'entrada.json'
            dados = dict(protocolo=dict(alternativa='bilateral', alfa=0.05, origemNotas='Simuladas', posicoes='Atuais'),
                         rodadas=[dict(partidaId='a', data='2026-10-01', participantes=4,
                                       manual=1, automatico=0, buscaConcluida=True)])
            entrada.write_text(json.dumps(dados), encoding='utf-8')
            executar(entrada, pasta)
            documento = Path(pasta) / 'relatorio.html'
            self.assertIn('Simuladas', documento.read_text(encoding='utf-8'))
            self.assertEqual(ler_entrada(documento), entrada.read_bytes())
            self.assertEqual(sorted(p.name for p in Path(pasta).iterdir()), ['entrada.json', 'relatorio.html'])
            executar(documento, pasta)
            self.assertEqual(ler_entrada(documento), entrada.read_bytes())
            dados['rodadas'].append(dados['rodadas'][0])
            entrada.write_text(json.dumps(dados), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'duplicada'):
                executar(entrada, pasta)


if __name__ == '__main__':
    unittest.main()
