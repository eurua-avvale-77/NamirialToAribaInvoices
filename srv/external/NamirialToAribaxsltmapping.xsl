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
  <xsl:param name="aribaId"/>
  <xsl:param name="domainId"/>
  <xsl:param name="SupplierVAT"/>
  <xsl:param name="CustomerVAT"/>
  <xsl:param name="timestamp"/>
  <xsl:param name="payloadID"/>



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
        <xsl:value-of select="$payloadID"/>
      </xsl:attribute>
      <xsl:attribute name="timestamp">
        <xsl:value-of select="$timestamp"/>
      </xsl:attribute>
      <xsl:attribute name="version">1.2.035</xsl:attribute>

      <!-- Header -->
      <Header>

        <From>
          <Credential domain="{$domainId}">
            <Identity><xsl:value-of select="$aribaId"/></Identity>
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

             <!--  <InvoiceDetailRequestHeaderReference>
                <DocumentReference payloadID="{DatiGenerali/DatiGeneraliDocumento/IdDocumento}"/>
              </InvoiceDetailRequestHeaderReference> -->
            <InvoiceDetailRequestHeader
              invoiceDate="{DatiGenerali/DatiGeneraliDocumento/Data || 'T00:00:00+00:00'}"
              invoiceID="{DatiGenerali/DatiGeneraliDocumento/Numero}"
              invoiceOrigin="supplier"
              operation="new">
              
        <xsl:attribute name="purpose">
        <xsl:choose>
            <xsl:when test="DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD04'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD08'">creditMemo</xsl:when>
            <xsl:otherwise>standard</xsl:otherwise>
        </xsl:choose>
        </xsl:attribute>

            <xsl:choose>
            <xsl:when test="DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD04'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD08'">
              <InvoiceDetailHeaderIndicator isHeaderInvoice="yes"/></xsl:when>
            <xsl:otherwise><InvoiceDetailHeaderIndicator/></xsl:otherwise>
            </xsl:choose>
              <!--<InvoiceDetailLineIndicator
                isAccountingInLine="yes"
                isShippingInLine="yes"
                isSpecialHandlingInLine="yes"
                isTaxLine="yes"/>    -->
              <InvoiceDetailLineIndicator/> 
              <xsl:choose>
              <xsl:when test="DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD07'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD08'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD09'"></xsl:when>
              <xsl:otherwise><PaymentTerm payInNumberOfDays="{DatiPagamento/DettaglioPagamento/GiorniTerminiPagamento}"/></xsl:otherwise>
              </xsl:choose>

              <!-- Mapping: invoiceSourceDocument e invoiceSubmissionMethod -->
              <Extrinsic name="invoiceSourceDocument">PurchaseOrder</Extrinsic>
              <Extrinsic name="invoiceSubmissionMethod">cXML</Extrinsic>
              <Extrinsic name="buyerVatID"><xsl:value-of select="$CustomerVAT"/></Extrinsic>
              <Extrinsic name="supplierVatID"><xsl:value-of select="$SupplierVAT"/></Extrinsic>
            </InvoiceDetailRequestHeader>
            <xsl:variable name="currency" select="DatiGenerali/DatiGeneraliDocumento/Divisa"/>
            <xsl:variable name="docTot" select="DatiGenerali/DatiGeneraliDocumento/ImportoTotaleDocumento"/>
            <!-- Ordine di riferimento -->
            <InvoiceDetailOrder>
            <xsl:choose>
              <xsl:when test="DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD07'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD08'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD09'">
              <InvoiceDetailOrderInfo>
                <OrderReference orderID="">
                  <DocumentReference payloadID=""/>
                </OrderReference>
              </InvoiceDetailOrderInfo>
              </xsl:when>
              <xsl:otherwise>
              <InvoiceDetailOrderInfo>
                <OrderReference orderID="{DatiGenerali/DatiOrdineAcquisto/IdDocumento}">
                  <DocumentReference payloadID=""/>
                </OrderReference>
              </InvoiceDetailOrderInfo>
            </xsl:otherwise>
            </xsl:choose>
            
              <xsl:choose>
              <xsl:when test="DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD07'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD08'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD09'">
              <!-- Linee di dettaglio Semplificata-->
                <InvoiceDetailItem invoiceLineNumber="1" quantity="1">
                  <UnitOfMeasure>EA</UnitOfMeasure>
                  <UnitPrice>
                    <Money currency="{$currency}">
                      <xsl:value-of select="sum(DatiBeniServizi/Importo)"/>
                    </Money>
                  </UnitPrice>

                  <!-- Price Basis Quantity -->

                  <PriceBasisQuantity conversionFactor="1" quantity="1">
                    <UnitOfMeasure>EA</UnitOfMeasure>
                    <Description xml:lang="en-US"></Description>
                  </PriceBasisQuantity>
             
                <InvoiceDetailItemReference lineNumber="1">
                    <ItemID>
                      <SupplierPartID>Non Catalog Item</SupplierPartID>
                    </ItemID>
                    <Description xml:lang="en">
                      <xsl:value-of select="normalize-space(Descrizione)"/>
                    </Description>
                  <!--<UnitOfMeasure>EA</UnitOfMeasure>
                  <Description xml:lang="en-US"></Description>-->
                  </InvoiceDetailItemReference>

                  
                  <!-- Totali -->
                  <SubtotalAmount>
                    <Money currency="{$currency}">
                      <xsl:value-of select="sum(DatiBeniServizi/Importo)"/>
                    </Money>
                  </SubtotalAmount>

                  <GrossAmount>
                    <Money currency="{$currency}">
                      <xsl:value-of select="sum(DatiBeniServizi/Importo)"/>
                    </Money>
                  </GrossAmount>

                  <NetAmount>
                    <Money currency="{$currency}">
                      <xsl:value-of select="sum(DatiBeniServizi/Importo)"/>
                    </Money>
                  </NetAmount>
                </InvoiceDetailItem>
              </xsl:when>
              <xsl:otherwise>
              <!-- Linee di dettaglio Fattura Ordinaria-->
              <xsl:for-each select="DatiBeniServizi/DettaglioLinee">
                <InvoiceDetailItem invoiceLineNumber="{NumeroLinea}" quantity="{Quantita}">
                  <UnitOfMeasure>EA</UnitOfMeasure>
                  <UnitPrice>
                    <Money currency="{$currency}">
                      <xsl:value-of select="PrezzoUnitario"/>
                    </Money>
                  </UnitPrice>

                  <!-- Price Basis Quantity -->

                  <PriceBasisQuantity conversionFactor="1" quantity="1">
                    <UnitOfMeasure>EA</UnitOfMeasure>
                    <Description xml:lang="en-US"></Description>
                  </PriceBasisQuantity>
             
                <InvoiceDetailItemReference lineNumber="1">
                    <ItemID>
                      <SupplierPartID>Non Catalog Item</SupplierPartID>
                    </ItemID>
                    <Description xml:lang="en">
                      <xsl:value-of select="normalize-space(Descrizione)"/>
                    </Description>
                  <!--<UnitOfMeasure>EA</UnitOfMeasure>
                  <Description xml:lang="en-US"></Description>-->
                </InvoiceDetailItemReference>

                  
                  <!-- Totali -->
                  <SubtotalAmount>
                    <Money currency="{$currency}">
                      <xsl:value-of select="PrezzoTotale"/>
                    </Money>
                  </SubtotalAmount>

                  <GrossAmount>
                    <Money currency="{$currency}">
                      <xsl:value-of select="PrezzoTotale"/>
                    </Money>
                  </GrossAmount>

                  <NetAmount>
                    <Money currency="{$currency}">
                      <xsl:value-of select="PrezzoTotale"/>
                    </Money>
                  </NetAmount>
                </InvoiceDetailItem>
                </xsl:for-each>
                </xsl:otherwise>
              </xsl:choose>
            </InvoiceDetailOrder>
            
           <xsl:choose>
              <xsl:when test="DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD07'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD08'
                            or DatiGenerali/DatiGeneraliDocumento/TipoDocumento = 'TD09'">
            <!-- Totali riepilogativi Semplificata -->
            <InvoiceDetailSummary>
              <!-- Mapping: Subtotal, Tax, Total -->
              <SubtotalAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="sum(DatiBeniServizi/Importo)"/>
                </Money>
              </SubtotalAmount>

              <Tax>
                <Money currency="{$currency}">
                  <xsl:value-of select="sum(DatiBeniServizi/DatiIVA/Imposta)"/>
                </Money>
                <Description xml:lang="en-US"></Description>
              </Tax>

              <GrossAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="sum(DatiBeniServizi/Importo) + sum(DatiBeniServizi/DatiIVA/Imposta)"/>
                </Money>
              </GrossAmount>

              <NetAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="sum(DatiBeniServizi/Importo) + sum(DatiBeniServizi/DatiIVA/Imposta)"/>
                </Money>
              </NetAmount>

            </InvoiceDetailSummary>
            </xsl:when>
            <xsl:otherwise>
            <!-- Totali riepilogativi Ordinaria -->
            <InvoiceDetailSummary>
              <!-- Mapping: Subtotal, Tax, Total -->
              <SubtotalAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="sum(DatiBeniServizi/DatiRiepilogo/ImponibileImporto)"/>
                </Money>
              </SubtotalAmount>

              <Tax>
                <Money currency="{$currency}">
                  <xsl:value-of select="sum(DatiBeniServizi/DatiRiepilogo/Imposta)"/>
                </Money>
                <Description xml:lang="en-US"></Description>
              </Tax>

              <GrossAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="$docTot"/>
                </Money>
              </GrossAmount>

              <NetAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="$docTot"/>
                </Money>
              </NetAmount>

              <DueAmount>
                <Money currency="{$currency}">
                  <xsl:value-of select="DatiPagamento/DettaglioPagamento/ImportoPagamento"/>
                </Money>
              </DueAmount>
            </InvoiceDetailSummary>
            </xsl:otherwise>
            </xsl:choose>
          
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
