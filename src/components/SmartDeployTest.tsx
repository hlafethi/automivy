import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import SmartDeployModal from './SmartDeployModal';

export function SmartDeployTest() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Smart Deploy</h1>
      
      <button
        onClick={() => {
          console.log('🔧 [SmartDeployTest] Bouton cliqué');
          setShowModal(true);
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Ouvrir Smart Deploy
      </button>

      <div className="mt-4">
        <p>État du modal: {showModal ? 'Ouvert' : 'Fermé'}</p>
      </div>

      <SmartDeployModal
        isOpen={showModal}
        onClose={() => {
          console.log('🔧 [SmartDeployTest] Modal fermé');
          setShowModal(false);
        }}
        onSuccess={(workflow) => {
          console.log('🔧 [SmartDeployTest] Succès:', workflow);
          setShowModal(false);
        }}
      />
    </div>
  );
}
