# Importar e exportar CSV do Drivvo

Abra **More → Settings → Drivvo CSV**.

1. Escolha o CSV exportado pelo Drivvo (UTF-8, até 5 MB).
2. Confira o número de abastecimentos, litros, valor total, datas e odômetros.
3. Para cada veículo do arquivo, selecione um veículo existente ou revise marca,
   modelo, ano e combustível para criar um novo. As sugestões vêm do nome no CSV;
   elas podem ser corrigidas antes da importação.
4. Confirme que a moeda dos valores é a mesma configurada no Car Vault. O CSV não
   informa a moeda. Valores não são convertidos; distâncias e volumes são km/L.
5. Clique **Import refuelling**. Em uma conta Firebase, aguarde o status de
   sincronização. A importação exige conexão e ausência de gravações pendentes.

## Compatibilidade

O formato implementado corresponde ao arquivo fornecido: seção `##Refuelling`,
30 colunas com cabeçalhos em português, odômetro em km e combustível em litros.
Aceita vírgula ou ponto e vírgula como separador, campos entre aspas, aspas
escapadas, quebras de linha em observações, BOM UTF-8 e decimais com ponto ou
vírgula. Datas usam `YYYY-MM-DD`, opcionalmente com horário.

O arquivo fornecido foi validado diretamente, sem copiar seus registros para o
repositório. Os testes permanentes usam dados fictícios; um teste opcional pode
ler um CSV privado indicado pela variável `DRIVVO_SAMPLE_FILE`.

Não são importadas seções de despesas, manutenções, recargas elétricas ou
abastecimentos com segundo/terceiro combustível. Se encontrados, o arquivo é
rejeitado por completo com uma mensagem; essas linhas não são ignoradas.

## Preservação e repetição

- A importação adiciona registros, sem substituir a garagem atual.
- Duplicatas são identificadas por veículo, data, odômetro, litros, preço por
  litro e valor total. Notas e alterações já existentes são preservadas.
- Duas linhas com esses mesmos valores são consideradas duplicadas, mesmo que
  tenham horários ou observações diferentes. O resumo informa quantas foram puladas.
- O odômetro do veículo só aumenta. As configurações regionais são preservadas.
- Os campos específicos do CSV (horário, motorista, motivo, forma de pagamento,
  desconto e demais colunas originais) acompanham o abastecimento no campo
  `drivvo.columns`. Não são publicados ou enviados a outro serviço além da conta
  Firebase escolhida pelo usuário, quando a sincronização está ativa.
- Os valores numéricos são mantidos sem arredondamento na importação/exportação;
  os formatos de apresentação na interface podem mostrar menos casas decimais.

## Exportação

**Export refuelling CSV** exporta todos os abastecimentos da garagem selecionada
(local ou da conta) no layout observado do Drivvo. As colunas principais refletem
as edições atuais no Car Vault; horário e campos exclusivos do CSV são preservados.
Registros criados no Car Vault sem horário são exportados com `00:00`.
Média e distância ficam vazias para serem recalculadas, evitando valores derivados
desatualizados. Textos que possam ser interpretados como fórmulas por planilhas
recebem um apóstrofo de proteção.

A leitura desse CSV pelo Car Vault e o ciclo exportar/importar foram testados.
A importação no próprio aplicativo Drivvo não foi validada.

Mantenha **Export JSON Backup** para um backup completo: o modelo CSV fornecido
não representa toda a garagem (recargas, despesas, manutenções, lembretes,
documentos e configurações). O limite atual da sincronização é de 400 registros
alterados por operação; arquivos maiores precisam ser divididos para importação
na conta. Não há importação parcial automática em caso de erro.
