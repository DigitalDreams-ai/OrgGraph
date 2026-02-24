trigger CaseBeforeUpdate on Case (before update) {
  List<Account> related = [SELECT Id FROM Account LIMIT 5];
  for (Account a : related) {
    a.Description = 'Touched by Case trigger';
  }
  update related;
}
