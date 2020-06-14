$(".change").on("click", function() {
  var wallet = $(".crypto-name").text();

  $(".change-window").slideToggle();
  $(".change").toggleClass("btn-primary").toggleClass("btn-outline-primary");

  $(".change-wallet-option").each(function(){
    if($(this).val() == wallet) {
      $(this).prop("disabled", true);
    } else {
      $(this).prop("disabled", false).prop("selected", true);
    }
  });
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
  $(".exchange-to-option").each(function() {
    if($(this).attr("disabled")) {
      $(this).removeAttr("disabled");
      $(this).prop("selected", true);
    } else {
      $(this).prop("disabled", true);
    }
  });
});

$(".add-wallet-btn").on("click", function() {
  var wallet = $(".crypto-name").text();

  $(".add-new-wallet-option").each(function() {
    if($(this).val() == wallet) {
      $(this).prop("disabled", true);
    } else {
      $(this).prop("disabled", false).prop("selected", true);
    }
  })
});
