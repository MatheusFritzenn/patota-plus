"""Análise pareada local. Não acessa o banco nem altera escalações."""
from html.parser import HTMLParser
from relatorio import gerar_html
import hashlib
import json
import math
import platform
import sys
from pathlib import Path

import numpy as np
import scipy
from scipy.stats import PermutationMethod, rankdata, wilcoxon


def analisar(diferencas):
    valores = np.asarray(diferencas, dtype=float)
    if valores.ndim != 1 or valores.size == 0 or not np.isfinite(valores).all():
        raise ValueError('Informe diferenças finitas em uma lista não vazia')
    # Precisão definida antes da análise; elimina ruído de ponto flutuante.
    valores = np.round(valores, 9)
    uteis = valores[valores != 0]
    n = len(uteis)
    if n > 16:
        raise ValueError('Rotina exata limitada a 16 pares não nulos; revise o protocolo antes de ampliar')
    resultado = dict(nTotal=len(valores), nEfetivo=n, zerosDescartados=len(valores)-n,
                     alternativa='bilateral', alfa=0.05, casasDecimais=9,
                     metodo='permutação exaustiva dos sinais (SciPy)',
                     diferencas=valores.tolist(), wMais=0.0, wMenos=0.0,
                     pValor=None, z=None, r=None, rAbsoluto=None,
                     formulaR='Z / sqrt(n efetivo); Z=(W+ - soma(postos)/2) / sqrt(soma(postos²)/4), sem correção de continuidade',
                     significativo=False, aviso=None)
    if n == 0:
        resultado['aviso'] = 'Todos os pares empatados: teste e tamanho de efeito indisponíveis.'
        return resultado
    postos = rankdata(np.abs(uteis), method='average')
    w_mais = float(postos[uteis > 0].sum())
    w_menos = float(postos[uteis < 0].sum())
    # Variância condicional com postos médios incorpora os empates.
    z = (w_mais - float(postos.sum()) / 2) / math.sqrt(float((postos ** 2).sum()) / 4)
    if n == 1:
        p = 1.0  # Dois sinais possíveis, ambos igualmente extremos no bilateral.
    else:
        teste = wilcoxon(uteis, zero_method='wilcox', alternative='two-sided',
                         correction=False, method=PermutationMethod(n_resamples=np.inf, batch=1024))
        p = float(teste.pvalue)
    resultado.update(wMais=w_mais, wMenos=w_menos, pValor=p, z=z,
                     r=z / math.sqrt(n), rAbsoluto=abs(z) / math.sqrt(n), significativo=p <= 0.05)
    if n < 6:
        resultado['aviso'] = 'Menos de seis pares não nulos: não é possível atingir 5% no bilateral exato.'
    return resultado


class LeitorEntrada(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ativo = False
        self.texto = []

    def handle_starttag(self, tag, attrs):
        if tag == 'pre' and dict(attrs).get('id') == 'entrada-original':
            self.ativo = True

    def handle_endtag(self, tag):
        if tag == 'pre':
            self.ativo = False

    def handle_data(self, data):
        if self.ativo:
            self.texto.append(data)


def ler_entrada(entrada):
    if str(entrada) == '-':
        return sys.stdin.buffer.read()
    bruto = Path(entrada).read_bytes()
    if Path(entrada).suffix.lower() == '.html':
        leitor = LeitorEntrada()
        leitor.feed(bruto.decode('utf-8'))
        if not leitor.texto:
            raise ValueError('HTML sem dados incorporados da compara??o')
        return ''.join(leitor.texto).encode('utf-8')
    return bruto


def executar(entrada, pasta):
    bruto = ler_entrada(entrada)
    dados = json.loads(bruto)
    if dados['protocolo']['alternativa'] != 'bilateral' or dados['protocolo']['alfa'] != 0.05:
        raise ValueError('Protocolo incompatível: esperado bilateral com alfa 0,05')
    rodadas = dados['rodadas']
    ids = [r['partidaId'] for r in rodadas]
    if len(set(ids)) != len(ids):
        raise ValueError('Rodada duplicada')
    for rodada in rodadas:
        for campo in ('manual', 'automatico'):
            if not isinstance(rodada[campo], (int, float)) or not math.isfinite(rodada[campo]) or not 0 <= rodada[campo] <= 10:
                raise ValueError('Métrica inválida: ' + campo)
    resultado = analisar([r['manual'] - r['automatico'] for r in rodadas])
    resultado['versoes'] = dict(python=platform.python_version(), scipy=scipy.__version__, numpy=np.__version__)
    resultado['entradaSha256'] = hashlib.sha256(bruto).hexdigest()
    resultado['protocolo'] = dados['protocolo']
    pasta = Path(pasta)
    pasta.mkdir(parents=True, exist_ok=True)
    documento = gerar_html(dados, resultado, bruto.decode('utf-8'))
    (pasta / 'relatorio.html').write_text(documento, encoding='utf-8')
    print(json.dumps(resultado, ensure_ascii=True, allow_nan=False))


if __name__ == '__main__':
    executar(sys.argv[1], sys.argv[2])
