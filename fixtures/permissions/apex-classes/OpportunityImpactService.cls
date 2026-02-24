public with sharing class OpportunityImpactService {
  public static void syncStage(List<Opportunity> opps) {
    List<Opportunity> scoped = [SELECT Id, StageName FROM Opportunity WHERE Id IN :opps];
    for (Opportunity o : scoped) {
      o.StageName = 'Closed Won';
    }
    update scoped;

    List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 5];
    update accounts;
  }
}
