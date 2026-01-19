import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';

interface Props {
  data: ContractData;
}

export default function RescissionPage({ data }: Props) {
  
  // CORRECCIÓN DE FECHAS: America/Guayaquil
  const getLegalDateText = () => {
    const d = data.date ? new Date(data.date) : new Date();
    const day = d.toLocaleDateString('es-EC', { day: 'numeric', timeZone: 'America/Guayaquil' });
    const month = d.toLocaleDateString('es-EC', { month: 'long', timeZone: 'America/Guayaquil' });
    const year = d.toLocaleDateString('es-EC', { year: 'numeric', timeZone: 'America/Guayaquil' });
    return `${day} días del mes de ${month} de ${year}`;
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '___/___/____'; 
    const d = new Date(dateString);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' });
  };

  const possessionDate = data.startDate 
    ? formatDateShort(data.startDate) 
    : (data.date ? formatDateShort(data.date) : '___/___/____');

  return (
    <PageLayout title=""> 
      <div className="font-serif text-[10pt] text-justify leading-snug space-y-4 -mt-4">
        
        <div className="text-center font-bold uppercase mb-6">
            <h2 className="text-lg">K-SI NUEVOS</h2>
            <h3 className="text-md underline decoration-1 underline-offset-4">CARTA DE RESCILIACIÓN</h3>
        </div>

        <div className="font-bold text-sm mb-2">
             CONTRATO NRO: {data.contractId || 'CCV-0000'}
        </div>

        <p>
          En Cuenca, a los {getLegalDateText()}, comparecen libre y voluntariamente y sin ningún tipo de coacción física o moral, 
          por una parte el (la) Sr (a) (ta) <strong>{data.clientName.toUpperCase()}</strong> con número de cédula de identidad <strong>{data.clientId}</strong>; 
          y por otra parte el señor <strong>FABIAN LEONARDO AGUIRRE MARQUEZ</strong> en calidad de Gerente y Representante Legal de <strong>K-SI NUEVOS</strong>, 
          quienes presentes realizan la siguiente acta de resciliación al tenor de las siguientes cláusulas:
        </p>

        <div>
            <p className="mb-2">
                <strong>PRIMERA: ANTECEDENTES.-</strong> Con fecha {getLegalDateText()}, el primer interviniente adquiere mediante venta con reserva de dominio a <strong>K-SI NUEVOS</strong>, un vehículo de las siguientes características:
            </p>
            
            <div className="border border-black p-2 text-[9pt] font-medium">
                <div className="grid grid-cols-2 gap-x-4">
                    <div className="space-y-1">
                        <div className="flex"><span className="w-24 font-bold">Matriculado:</span> <span>{data.clientCity || 'CUENCA'}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Placas:</span> <span>{data.carPlate}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Tipo:</span> <span>{data.carType || 'VEHÍCULO'}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Modelo:</span> <span>{data.carModel}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Color:</span> <span>{data.carColor}</span></div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex"><span className="w-32 font-bold">por el año:</span> <span>{new Date().getFullYear()}</span></div>
                        <div className="flex"><span className="w-32 font-bold">Marca:</span> <span>{data.carMake}</span></div>
                        <div className="flex"><span className="w-32 font-bold">Año de Fabricación:</span> <span>{data.carYear}</span></div>
                        <div className="flex"><span className="w-32 font-bold">Motor:</span> <span>{data.carEngine}</span></div>
                        <div className="flex"><span className="w-32 font-bold">Chasis:</span> <span>{data.carChassis}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <p>
            <strong>SEGUNDA: SOLICITUD DE RESCILIACION.-</strong> El día de hoy el (la) Sr (a) <strong>{data.clientName.toUpperCase()}</strong> ante la imposibilidad de continuar cancelando el crédito que se encuentra vencido solicita a <strong>K-SI NUEVOS</strong>, se proceda a resciliar el contrato de compra venta con reserva de dominio mencionado en la cláusula primera.
        </p>

        <p>
            <strong>TERCERA: ACEPTACION DE RESCILIACION.-</strong> La solicitud de resciliación es aceptada por el señor <strong>FABIAN LEONARDO AGUIRRE MARQUEZ</strong> en calidad de Gerente y Representante Legal de <strong>K-SI NUEVOS</strong>, por lo que a partir de la presente fecha el vehículo vuelve a la propiedad de K-SI NUEVOS y puede disponer libremente del mismo con todas las atribuciones que le otorga la Ley en calidad de propietario del mismo, por lo que los señores, nada tendrán que reclamar por este concepto.
        </p>

        <p>
            <strong>CUARTA: LETRAS DE CAMBIO.-</strong> Las letras que no han sido canceladas por la negociación referida en cláusula primera son anuladas y entregadas al deudor, previa liquidación de los gastos realizados.
        </p>

        <p>
            <strong>QUINTA: RESPONSABILIDAD CIVIL.-</strong> El (la) Sr (a) (ta) <strong>{data.clientName.toUpperCase()}</strong> asume total responsabilidad respecto a las multas infracciones o accidentes de tránsito o cualquier acto o acontecimiento que pudo llegar a suscitarse durante el tiempo que el vehículo estuvo en poder del mencionado señor, es decir desde el <strong>{possessionDate} 0:00:00</strong>, hasta la presente fecha y deslindan de toda responsabilidad a <strong>K-SI NUEVOS</strong>, el vehículo lo devuelve libre de todo gravamen, en caso de existir gravamen alguno que se haya generado durante el tiempo que el deudor tenía el vehículo en su poder, el señor (a) <strong>{data.clientName.toUpperCase()}</strong> , se compromete a sanearlo.
        </p>
        
        <p>
            Las partes renuncian a cualquier reclamo judicial o extrajudicial respecto del presente acuerdo, y asumen total responsabilidad por el mismo declarando que lo realizan libre y voluntariamente por ser ese su deseo, deslindando de toda responsabilidad al señor FABIAN LEONARDO AGUIRRE MARQUEZ gerente y Representante Legal de K-SI NUEVOS.
        </p>

        <p className="mt-6">
            Para constancia firman el presente documento en la fecha y lugar inicialmente señalados, renunciando las partes a cualquier reclamo posterior.
        </p>
        
        <p className="font-bold mt-4 uppercase">ATENTAMENTE,</p>

        <div className="mt-16 grid grid-cols-2 gap-16 text-center text-[9pt] font-bold uppercase">
            <div className="flex flex-col items-center">
                <div className="border-t border-black w-56 mb-2"></div>
                <p>{data.clientName}</p>
                <p className="font-normal text-[8pt]">C.C. No. {data.clientId}</p>
            </div>

            <div className="flex flex-col items-center">
                <div className="border-t border-black w-56 mb-2"></div>
                <p className="normal-case mb-1">Aceptación</p> 
                <p>Fabián Aguirre</p>
            </div>
        </div>

      </div>
    </PageLayout>
  );
}