$(".change").on("click", function() {
  $(".change-window").slideToggle();
  $(".change").toggleClass("btn-primary").toggleClass("btn-outline-primary");
});

$(".add-select").change(function() {
  var current = $(".current-wallet").text();
  console.log(current);
  var selected = $(".add-select option:selected").text();
  console.log(selected);
  if (current == selected) {
    $(".add-wallet-alert").show();
    $(".add-wallet-btn").addClass("disabled");
  }
});




$(".exchange-from-select").change(function() {
  var selected = $(".exchange-from-select option:selected").text();
  console.log($(".exchange-to-select option"));
});
