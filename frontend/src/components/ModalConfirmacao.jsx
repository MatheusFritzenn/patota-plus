function ModalConfirmacao({ aberto, titulo, mensagem, textoBotaoConfirmar, corBotaoConfirmar, onConfirmar, onCancelar }) {
  if (!aberto) return null

  // Define a classe de cor do botão de confirmação (padrão: vermelho)
  let classeBotaoConfirmar = 'bg-red-600 hover:bg-red-700'
  if (corBotaoConfirmar === 'verde') {
    classeBotaoConfirmar = 'bg-green-600 hover:bg-green-700'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay escuro */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancelar}
      />

      {/* Card do modal */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          {titulo || 'Confirmação'}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {mensagem || 'Tem certeza que deseja continuar?'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className={'flex-1 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer ' + classeBotaoConfirmar}
          >
            {textoBotaoConfirmar || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmacao
