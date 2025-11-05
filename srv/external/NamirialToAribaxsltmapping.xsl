<?xml version="1.0" encoding="UTF-8"?>
<!-- 
  XSLT: mapping_namirial_to_cxml.xslt
  Autore: ChatGPT (OpenAI)
  Scopo: Trasformare una Fattura Elettronica Namirial (senza namespace) 
         in un cXML InvoiceDetailRequest per Ariba / NetworkID
  Note:  Genera un cXML per ogni FatturaElettronicaBody
-->

<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!-- Output -->
  <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

  <!-- Template principale -->
  <xsl:template match="/">
      <xsl:for-each select="//FatturaElettronicaBody">
            <!-- Ogni corpo di fattura genera un cXML -->
          <!-- Generate a unique filename for each -->

      <xsl:variable name="num" select="position()"/>
      <xsl:variable name="file" select="DatiGenerali/DatiGeneraliDocumento/Numero || '.xml'"/>

    <xsl:result-document href="{$file}">
    <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.035/InvoiceDetail.dtd"&gt;</xsl:text>
    <cXML>
      <!-- Payload ID e Timestamp -->
      <!-- cXML: /cXML/@payloadID ← generato univocamente -->
      <xsl:attribute name="payloadID">
        <xsl:value-of select="concat('PAYLOAD-', generate-id())"/>
      </xsl:attribute>
      <xsl:attribute name="timestamp">
        <xsl:value-of select="concat(substring-before(current-dateTime(), '+'), 'Z')"/>
      </xsl:attribute>
      <xsl:attribute name="version">1.2.035</xsl:attribute>

      <!-- Header -->
      <Header>
        <From>
          <Credential domain="buyersystemid">
            <Identity>ACM_57473133</Identity>
          </Credential>
        </From>
        <To>
          <Credential domain="systemID">
            <Identity>CHILD1</Identity>
          </Credential>
          <Credential domain="NetworkID">
            <Identity>AN11182646989-T</Identity>
          </Credential>
        </To>
        <Sender>
          <Credential domain="NetworkID">
            <Identity>CHILD1-AN11182646989-T</Identity>
            <SharedSecret>ARIBA123</SharedSecret>
          </Credential>
          <UserAgent>Buyer</UserAgent>
        </Sender>
      </Header>

      <!-- Request principale -->
      <Request deploymentMode="test">
        <InvoiceDetailRequest>


            <InvoiceDetailRequestHeader
              invoiceDate="{DatiGenerali/DatiGeneraliDocumento/Data || 'T00:00:00+00:00'}"
              invoiceID="{DatiGenerali/DatiGeneraliDocumento/Numero}"
              invoiceOrigin="supplier"
              operation="new"
              purpose="standard">

              <InvoiceDetailHeaderIndicator/>
              <InvoiceDetailLineIndicator
                isAccountingInLine="yes"
                isShippingInLine="yes"
                isSpecialHandlingInLine="yes"/>

              <!-- Mapping: invoiceSourceDocument e invoiceSubmissionMethod -->
              <Extrinsic name="invoiceSourceDocument">PurchaseOrder</Extrinsic>
              <Extrinsic name="invoiceSubmissionMethod">cXML</Extrinsic>
            </InvoiceDetailRequestHeader>
            <xsl:variable name="Divisa" select="DatiGenerali/DatiGeneraliDocumento/Divisa"/>
            <!-- Ordine di riferimento -->
            <InvoiceDetailOrder>
              <InvoiceDetailOrderInfo>
                <OrderReference orderID="{DatiGenerali/DatiOrdineAcquisto/IdDocumento}">
                  <DocumentReference payloadID="{generate-id()}"/>
                </OrderReference>
              </InvoiceDetailOrderInfo>

              <!-- Linee di dettaglio -->
              <xsl:for-each select="DatiBeniServizi/DettaglioLinee">
                <InvoiceDetailItem invoiceLineNumber="{NumeroLinea}" quantity="{Quantita}">
                  <UnitOfMeasure>EA</UnitOfMeasure>
                  <UnitPrice>
                    <Money currency="{$Divisa}">
                      <xsl:value-of select="PrezzoUnitario"/>
                    </Money>
                  </UnitPrice>

                  <!-- Price Basis Quantity -->
                  <PriceBasisQuantity conversionFactor="1" quantity="1">
                    <UnitOfMeasure>EA</UnitOfMeasure>
                    <Description xml:lang="en-US"></Description>
                  </PriceBasisQuantity>

                  <InvoiceDetailItemReference lineNumber="{NumeroLinea}">
                    <ItemID>
                      <SupplierPartID>Non Catalog Item</SupplierPartID>
                    </ItemID>
                    <Description xml:lang="en">
                      <xsl:value-of select="normalize-space(Descrizione)"/>
                    </Description>
                  </InvoiceDetailItemReference>

                  <!-- Totali -->
                  <SubtotalAmount>
                    <Money currency="{$Divisa}">
                      <xsl:value-of select="PrezzoTotale"/>
                    </Money>
                  </SubtotalAmount>

                  <InvoiceDetailLineSpecialHandling>
                    <Description xml:lang="en-US"/>
                    <Money currency="{$Divisa}">0.00</Money>
                  </InvoiceDetailLineSpecialHandling>

                  <GrossAmount>
                    <Money currency="{$Divisa}">
                      <xsl:value-of select="PrezzoTotale"/>
                    </Money>
                  </GrossAmount>

                  <NetAmount>
                    <Money currency="{$Divisa}">
                      <xsl:value-of select="PrezzoTotale"/>
                    </Money>
                  </NetAmount>
                </InvoiceDetailItem>
              </xsl:for-each>
            </InvoiceDetailOrder>

            <!-- Totali riepilogativi -->
            <InvoiceDetailSummary>
              <!-- Mapping: Subtotal, Tax, Total -->
              <SubtotalAmount>
                <Money currency="{$Divisa}">
                  <xsl:value-of select="DatiBeniServizi/DatiRiepilogo/ImponibileImporto"/>
                </Money>
              </SubtotalAmount>

              <Tax>
                <Money currency="{$Divisa}">
                  <xsl:value-of select="DatiBeniServizi/DatiRiepilogo/Imposta"/>
                </Money>
                <Description xml:lang="en-US"></Description>
              </Tax>

              <SpecialHandlingAmount>
                <Money currency="{$Divisa}">0.00</Money>
              </SpecialHandlingAmount>

              <ShippingAmount>
                <Money currency="{$Divisa}">0.00</Money>
              </ShippingAmount>

              <GrossAmount>
                <Money currency="{$Divisa}">
                  <xsl:value-of select="DatiBeniServizi/DatiRiepilogo/ImponibileImporto"/>
                </Money>
              </GrossAmount>

              <NetAmount>
                <Money currency="{$Divisa}">
                  <xsl:value-of select="DatiBeniServizi/DatiRiepilogo/ImponibileImporto"/>
                </Money>
              </NetAmount>

              <DueAmount>
                <Money currency="{$Divisa}">
                  <xsl:value-of select="DatiPagamento/DettaglioPagamento/ImportoPagamento"/>
                </Money>
              </DueAmount>
            </InvoiceDetailSummary>
          
        </InvoiceDetailRequest>
      </Request>
    </cXML>
    <!-- Write to separate file -->
      <!--<xsl:result-document href="{$file}">-->
        <!--<xsl:copy-of select="."/>-->
      </xsl:result-document>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
