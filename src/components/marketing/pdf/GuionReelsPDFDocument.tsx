import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { GUION_PDF_COLORS, type GuionData } from '@/types/guion-pdf'

const C = GUION_PDF_COLORS

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: C.text,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  logo: {
    width: 110,
    height: 32,
    objectFit: 'contain',
  },
  brandFallback: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  headerMeta: {
    alignItems: 'flex-end',
    maxWidth: '55%',
  },
  vehiculo: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.headerBg,
    textAlign: 'right',
  },
  metaLine: {
    fontSize: 8,
    color: C.muted,
    marginTop: 3,
    textAlign: 'right',
  },
  titulo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.headerBg,
    marginBottom: 6,
  },
  tipoChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.accent,
    color: C.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  objetivoBox: {
    backgroundColor: C.rowAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  objetivoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  objetivoText: {
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.headerBg,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    color: C.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 7,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  tableRowAlt: {
    backgroundColor: C.rowAlt,
  },
  colEsc: { width: '5%' },
  colTiempo: { width: '10%' },
  colAccion: { width: '38%' },
  colDialogo: { width: '47%' },
  cellEsc: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.accent,
    textAlign: 'center',
  },
  cellTiempo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.headerBg,
  },
  cellAccion: {
    fontSize: 8.5,
    lineHeight: 1.35,
    paddingRight: 6,
  },
  cellDialogo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    lineHeight: 1.4,
    paddingRight: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: C.muted,
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
  },
  emptyText: {
    fontSize: 9,
    color: C.muted,
    textAlign: 'center',
    marginTop: 24,
  },
})

export function GuionReelsPDFDocument({ data }: { data: GuionData }) {
  return (
    <Document title={data.titulo ?? data.vehiculo} author="KSi NUEVOS">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {data.logoUrl ? (
            <Image src={data.logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.brandFallback}>KSi NUEVOS</Text>
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.vehiculo}>{data.vehiculo}</Text>
            {data.vendedor ? (
              <Text style={styles.metaLine}>Vendedor: {data.vendedor}</Text>
            ) : null}
            {data.fecha ? <Text style={styles.metaLine}>{data.fecha}</Text> : null}
          </View>
        </View>

        {data.tipoGuion ? <Text style={styles.tipoChip}>{data.tipoGuion}</Text> : null}
        {data.titulo ? <Text style={styles.titulo}>{data.titulo}</Text> : null}

        {data.objetivo ? (
          <View style={styles.objetivoBox}>
            <Text style={styles.objetivoLabel}>Objetivo</Text>
            <Text style={styles.objetivoText}>{data.objetivo}</Text>
          </View>
        ) : null}

        {data.tomas.length > 0 ? (
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colEsc]}>Esc.</Text>
              <Text style={[styles.th, styles.colTiempo]}>Tiempo</Text>
              <Text style={[styles.th, styles.colAccion]}>Acción visual</Text>
              <Text style={[styles.th, styles.colDialogo]}>Diálogo / Voz en off</Text>
            </View>

            {data.tomas.map((toma, index) => (
              <View
                key={toma.numero}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.cellEsc, styles.colEsc]}>{toma.numero}</Text>
                <Text style={[styles.cellTiempo, styles.colTiempo]}>
                  {toma.tiempo?.trim() || '—'}
                </Text>
                <Text style={[styles.cellAccion, styles.colAccion]}>{toma.descripcionToma}</Text>
                <Text style={[styles.cellDialogo, styles.colDialogo]}>{toma.guion}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Sin escenas para este guión.</Text>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>KSi NUEVOS</Text>
          <Text style={styles.footerText}>Guión de video · {data.vehiculo}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
