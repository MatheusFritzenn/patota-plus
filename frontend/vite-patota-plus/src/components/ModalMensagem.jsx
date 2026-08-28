function ModalMensagem({ aberto, titulo, mensagem, onFechar }) {
  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay escuro */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onFechar}
      />

      {/* Card do modal */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          {titulo || 'Aviso'}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {mensagem}
        </p>

        <button
          onClick={onFechar}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

export default ModalMensagem
