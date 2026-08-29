import React from 'react';
import { LOCATION_DATA } from './locationData';
import { LocationDetails } from './LocationDetails';

export const LocationSection = () => {
  return (
    <section className="py-24 bg-gray-50" id="sedes">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50 flex flex-col md:flex-row min-h-[500px]">
          <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
            <LocationDetails />
          </div>

          <div className="w-full md:w-1/2 relative h-64 md:h-auto">
            <img
              src={LOCATION_DATA.image}
              alt={LOCATION_DATA.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
